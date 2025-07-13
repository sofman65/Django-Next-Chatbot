"""
Advanced RAG Logic Integration
Integrates the advanced RAG pipeline from advanced_rag module with Django
"""
import os
import sys
import json
import hashlib
import threading
import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Generator
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# Add the advanced_rag src directory to Python path
ADVANCED_RAG_PATH = Path(__file__).parent.parent / "advanced_rag" / "src"
sys.path.insert(0, str(ADVANCED_RAG_PATH))

try:
    from pipeline import Pipeline, RunConfig, PipelineConfig
    from questions_processing import QuestionsProcessor
    from retrieval import VectorRetriever, HybridRetriever
    from pdf_parsing import PDFParser
    from api_requests import APIProcessor
    
    # For type hints
    _APIProcessor = APIProcessor
except ImportError as e:
    logging.error(f"Failed to import advanced RAG modules: {e}")
    Pipeline = None
    RunConfig = None
    _APIProcessor = None

# Import models from modular apps
from apps.rag.models import Document, DocumentSet, ProcessingPipeline, Chunk

logger = logging.getLogger(__name__)

class AdvancedRAGManager:
    """Manages the advanced RAG pipeline integration with Django"""
    
    def __init__(self):
        self.base_path = Path(settings.MEDIA_ROOT) / "rag_data"
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Processing lock to prevent concurrent pipeline runs
        self._processing_lock = threading.Lock()
        self._active_pipelines = {}
        self._logs = []  # Internal log storage
    
    def get_document_set_path(self, document_set_name: str) -> Path:
        """Get the base path for a document set's RAG data"""
        path = self.base_path / document_set_name
        path.mkdir(parents=True, exist_ok=True)
        return path
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA1 hash of a file"""
        sha1_hash = hashlib.sha1()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha1_hash.update(chunk)
        return sha1_hash.hexdigest()
    
    def upload_document(self, document_set_name: str, file, title: str, user=None) -> Document:
        """Upload and register a new document"""
        try:
            # Get or create document set
            document_set, created = DocumentSet.objects.get_or_create(
                name=document_set_name,
                defaults={'description': f'Document set for {document_set_name}'}
            )
            
            # Save file
            file_path = default_storage.save(f"docs/{document_set_name}/{file.name}", file)
            full_file_path = Path(settings.MEDIA_ROOT) / file_path
            
            # Calculate hash
            file_hash = self.calculate_file_hash(full_file_path)
            
            # Create document record
            document = Document.objects.create(
                title=title,
                file=file_path,
                document_set=document_set,
                file_size=file.size,
                file_type=file.name.split('.')[-1].lower() if '.' in file.name else '',
                sha1_hash=file_hash,
                status='uploaded'
            )
            
            # Create or get processing pipeline
            pipeline, created = ProcessingPipeline.objects.get_or_create(
                document_set=document_set,
                defaults={
                    'status': 'idle',
                    'use_serialized_tables': False,
                    'parent_document_retrieval': True,
                    'llm_reranking': True,
                    'top_n_retrieval': 20
                }
            )
            
            logger.info(f"Document uploaded: {title} to {document_set_name}")
            return document
            
        except Exception as e:
            logger.error(f"Error uploading document: {e}")
            raise
    
    def start_pipeline_processing(self, document_set_name: str, force_rebuild: bool = False) -> bool:
        """Start processing pipeline for a document set"""
        if document_set_name in self._active_pipelines:
            logger.warning(f"Pipeline already active for {document_set_name}")
            return False
        
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            # Check if pipeline is currently running
            if pipeline_obj.status in ['parsing', 'indexing']:
                logger.warning(f"Pipeline already running for {document_set_name} (status: {pipeline_obj.status})")
                return False
            
            # Check if already completed and not forcing rebuild
            if pipeline_obj.status == 'completed' and not force_rebuild:
                logger.info(f"Pipeline already completed for {document_set_name}")
                return True
            
            # Reset pipeline status if we're rerunning
            if force_rebuild or pipeline_obj.status == 'failed':
                pipeline_obj.status = 'pending'
                pipeline_obj.progress_percentage = 0
                pipeline_obj.current_step = "Preparing to start pipeline"
                pipeline_obj.error_message = ""
                pipeline_obj.save()
            
            # Start processing in background thread
            thread = threading.Thread(
                target=self._run_pipeline_thread,
                args=(document_set_name,),
                daemon=True
            )
            thread.start()
            
            self._active_pipelines[document_set_name] = thread
            logger.info(f"Started pipeline processing for {document_set_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting pipeline: {e}")
            return False
    
    def _run_pipeline_thread(self, document_set_name: str):
        """Run the advanced RAG pipeline in a background thread"""
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            # Update pipeline status
            pipeline_obj.status = 'parsing'
            pipeline_obj.started_at = timezone.now()
            pipeline_obj.progress_percentage = 5
            pipeline_obj.current_step = "Initializing pipeline"
            pipeline_obj.save()
            logger.info(f"Pipeline started for {document_set_name}")
            
            # Setup pipeline paths
            data_path = self.get_document_set_path(document_set_name)
            pdf_dir = data_path / "pdf_reports"
            pdf_dir.mkdir(exist_ok=True)
            
            # Update progress
            pipeline_obj.progress_percentage = 10
            pipeline_obj.current_step = "Preparing documents"
            pipeline_obj.save()
            
            # Copy uploaded documents to PDF directory
            # Get all documents for this set, regardless of status for rebuild scenarios
            all_documents = Document.objects.filter(document_set=document_set)
            documents = all_documents.filter(status__in=['uploaded', 'parsing', 'parsed'])
            total_documents = documents.count()
            
            logger.info(f"Found {total_documents} documents to process for {document_set_name}")
            
            if total_documents == 0:
                # Check if there are any documents at all
                all_docs_count = all_documents.count()
                if all_docs_count == 0:
                    logger.error(f"No documents found in document set {document_set_name}")
                    raise Exception("No documents found in document set. Please upload documents first.")
                else:
                    logger.warning(f"Found {all_docs_count} documents but none are in processable status")
                    # Reset all documents to uploaded status for reprocessing
                    all_documents.update(status='uploaded')
                    documents = all_documents
                    total_documents = all_docs_count
            
            for i, doc in enumerate(documents):
                src_path = Path(settings.MEDIA_ROOT) / doc.file.name
                dst_path = pdf_dir / f"{doc.sha1_hash}.pdf"
                
                if src_path.exists() and doc.file_type.lower() == 'pdf':
                    import shutil
                    shutil.copy2(src_path, dst_path)
                    doc.status = 'parsing'
                    doc.save()
                    
                    # Update progress during file preparation
                    progress = 10 + (i + 1) / total_documents * 10  # 10-20% for file prep
                    pipeline_obj.progress_percentage = int(progress)
                    pipeline_obj.save()
            
            # Create subset.csv for metadata
            pipeline_obj.progress_percentage = 20
            pipeline_obj.current_step = "Creating document metadata"
            pipeline_obj.save()
            
            self._create_subset_csv(data_path, documents)
            
            # Configure advanced RAG pipeline with optimized settings
            pipeline_obj.progress_percentage = 25
            pipeline_obj.current_step = "Configuring pipeline with enhanced settings"
            pipeline_obj.save()
            
            run_config = RunConfig(
                use_serialized_tables=pipeline_obj.use_serialized_tables,
                parent_document_retrieval=pipeline_obj.parent_document_retrieval,
                llm_reranking=True,  # Force enable for better results
                top_n_retrieval=min(pipeline_obj.top_n_retrieval, 20),  # Cap at 20 for optimal context
                parallel_requests=3,  # Reduced for stability and API limits
                config_suffix=f"_{document_set_name}"
            )
            
            # Initialize pipeline
            pipeline = Pipeline(data_path, run_config=run_config)
            
            # Step 1: Parse PDFs (this is the long Docling process)
            pipeline_obj.current_step = "Parsing PDF documents with Docling (this may take several minutes)"
            pipeline_obj.progress_percentage = 30
            pipeline_obj.save()
            logger.info(f"Starting PDF parsing for {document_set_name} - this will take several minutes")
            
            # Parse PDFs with progress monitoring
            self._parse_pdfs_with_monitoring(pipeline, pipeline_obj, data_path, total_documents)
            
            # Update document statuses after parsing
            pipeline_obj.progress_percentage = 60
            pipeline_obj.current_step = "PDF parsing completed"
            pipeline_obj.save()
            
            for doc in documents:
                doc.status = 'parsed'
                doc.save()
            
            # Step 2: Merge reports
            pipeline_obj.current_step = "Merging parsed reports"
            pipeline_obj.progress_percentage = 65
            pipeline_obj.save()
            logger.info(f"Merging reports for {document_set_name}")
            
            pipeline.merge_reports()
            
            # Step 3: Chunk reports
            pipeline_obj.current_step = "Chunking documents for retrieval"
            pipeline_obj.progress_percentage = 75
            pipeline_obj.save()
            logger.info(f"Chunking documents for {document_set_name}")
            
            pipeline.chunk_reports()
            
            # Step 4: Create global vector database using new approach
            pipeline_obj.current_step = "Creating global FAISS vector index with HuggingFace embeddings"
            pipeline_obj.progress_percentage = 85
            pipeline_obj.status = 'indexing'
            pipeline_obj.save()
            logger.info(f"Creating global FAISS vector database for {document_set_name}")
            
            # Use new global VectorDBIngestor
            try:
                from ingestion import VectorDBIngestor
                
                # Initialize the new global ingestor
                vector_ingestor = VectorDBIngestor(str(data_path))
                
                # Process reports using global approach - look for chunked_reports directory
                chunked_reports_dir = data_path / "databases" / "chunked_reports"
                if chunked_reports_dir.exists():
                    # Use the chunked_reports as the data subset
                    success = vector_ingestor.process_reports("databases/chunked_reports")
                    if success:
                        logger.info(f"Successfully created global FAISS index for {document_set_name}")
                    else:
                        logger.error(f"Failed to create global FAISS index for {document_set_name}")
                        raise Exception("Global FAISS index creation failed")
                else:
                    logger.error(f"Chunked reports directory not found: {chunked_reports_dir}")
                    raise Exception("Chunked reports not found. PDF processing may have failed.")
                    
            except ImportError as e:
                logger.warning(f"New VectorDBIngestor not available, falling back to old pipeline: {e}")
                # Fallback to old method
                pipeline.create_vector_dbs()
            except Exception as e:
                logger.error(f"Error creating global vector database: {e}")
                # Fallback to old method
                logger.info("Falling back to old vector database creation method")
                pipeline.create_vector_dbs()
            
            # Step 5: Update document metadata
            pipeline_obj.current_step = "Finalizing document metadata"
            pipeline_obj.progress_percentage = 95
            pipeline_obj.save()
            
            self._update_document_metadata(data_path, documents)
            
            # Mark as completed
            pipeline_obj.status = 'completed'
            pipeline_obj.progress_percentage = 100
            pipeline_obj.completed_at = timezone.now()
            pipeline_obj.current_step = "Processing completed successfully"
            pipeline_obj.save()
            
            # Update document statuses
            for doc in documents:
                doc.status = 'indexed'
                doc.processed_at = timezone.now()
                doc.save()
            
            logger.info(f"Pipeline completed successfully for {document_set_name}")
            
        except Exception as e:
            logger.error(f"Pipeline failed for {document_set_name}: {e}")
            
            # Update pipeline with error
            try:
                pipeline_obj.status = 'failed'
                pipeline_obj.error_message = str(e)
                pipeline_obj.current_step = f"Processing failed: {str(e)}"
                pipeline_obj.save()
                
                # Mark documents as failed
                for doc in documents:
                    doc.status = 'failed'
                    doc.error_message = str(e)
                    doc.save()
            except:
                pass
        
        finally:
            # Remove from active pipelines
            if document_set_name in self._active_pipelines:
                del self._active_pipelines[document_set_name]
    
    def _create_subset_csv(self, data_path: Path, documents):
        """Create subset.csv file for the pipeline"""
        import csv
        
        csv_path = data_path / "subset.csv"
        with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['sha1', 'company_name'])
            
            for doc in documents:
                if doc.sha1_hash:
                    writer.writerow([doc.sha1_hash, doc.title])
    
    def _update_document_metadata(self, data_path: Path, documents):
        """Update document metadata from parsed results"""
        parsed_dir = data_path / "debug_data" / "01_parsed_reports"
        
        if not parsed_dir.exists():
            return
        
        for doc in documents:
            if not doc.sha1_hash:
                continue
            
            parsed_file = parsed_dir / f"{doc.sha1_hash}.json"
            if parsed_file.exists():
                try:
                    with open(parsed_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    metainfo = data.get('metainfo', {})
                    doc.pages_count = metainfo.get('pages_amount', 0)
                    doc.tables_count = metainfo.get('tables_amount', 0)
                    doc.pictures_count = metainfo.get('pictures_amount', 0)
                    doc.text_blocks_count = metainfo.get('text_blocks_amount', 0)
                    doc.save()
                    
                except Exception as e:
                    logger.error(f"Error updating metadata for {doc.title}: {e}")
    
    def query_documents(self, document_set_name: str, query: str, user=None) -> Generator[Dict[str, Any], None, None]:
        """Query documents using the advanced RAG pipeline"""
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            if pipeline_obj.status != 'completed':
                yield {"error": "Document set is not ready for querying. Please wait for processing to complete."}
                return
            
            # Setup paths
            data_path = self.get_document_set_path(document_set_name)
            vector_db_dir = data_path / "databases" / "vector_dbs"
            documents_dir = data_path / "databases" / "chunked_reports"
            
            if not vector_db_dir.exists():
                yield {"error": "Vector database not found. Please rebuild the document set."}
                return
            
            # Initialize new global FAISS retriever
            try:
                from retrieval import FaissRetriever
                retriever = FaissRetriever(vector_db_dir, documents_dir)
                
                # Log retriever stats
                stats = retriever.get_index_stats()
                logger.info(f"Using global FAISS index with {stats.get('total_documents', 0)} documents")
                
            except Exception as e:
                logger.error(f"Failed to initialize FaissRetriever: {e}")
                # Fallback to old retriever for backward compatibility
                if pipeline_obj.llm_reranking:
                    retriever = HybridRetriever(vector_db_dir, documents_dir)
                else:
                    retriever = VectorRetriever(vector_db_dir, documents_dir)
            
            # Retrieve relevant documents using global search
            try:
                if hasattr(retriever, 'retrieve_by_query'):
                    # New global FAISS retriever
                    retrieval_results = retriever.retrieve_by_query(
                        query=query,
                        top_n=min(pipeline_obj.top_n_retrieval, 15),
                        company_filter=None  # Search across all documents
                    )
                else:
                    # Old retriever fallback
                    retrieval_results = retriever.retrieve_by_query(
                        query=query,
                        llm_reranking_sample_size=50,
                        top_n=min(pipeline_obj.top_n_retrieval, 15)
                    )
            except Exception as e:
                logger.error(f"Error during retrieval: {e}")
                yield {"error": "Failed to retrieve relevant documents."}
                return
            
            if not retrieval_results:
                yield {"answer": "No relevant information found in the documents."}
                return
            
            # Format context
            context = self._format_retrieval_context(retrieval_results)
            
            # Generate response using API processor
            api_processor = APIProcessor()
            
            # Stream the response
            for token in self._stream_rag_response(api_processor, query, context):
                yield token
                
        except Exception as e:
            logger.error(f"Error querying documents: {e}")
            yield {"error": f"An error occurred while processing your query: {str(e)}"}
    
    def _format_retrieval_context(self, retrieval_results: List[Dict]) -> str:
        """Format retrieval results into context string"""
        if not retrieval_results:
            return ""
        
        context_parts = []
        for i, result in enumerate(retrieval_results):
            page_number = result.get('page', '?')
            text = result.get('text', '')
            doc_name = result.get('document_name', 'Unknown')
            score = result.get('distance', 'N/A')
            
            context_parts.append(
                f'[Source {i+1}] From document "{doc_name}", page {page_number}, relevance: {score}:\n"""\n{text}\n"""'
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    def _stream_rag_response(self, api_processor, query: str, context: str) -> Generator[Dict[str, str], None, None]:
        """Stream RAG response using the API processor"""
        system_prompt = """You are a helpful AI assistant that answers questions based on the provided context. 
        Use the context to provide accurate, detailed answers. If the context doesn't contain enough information 
        to answer the question, say so clearly. Always cite which sources you're using in your response.
        
        Make sure to provide complete, comprehensive answers. Structure your response clearly and cite specific sources."""
        
        user_prompt = f"""Context:\n{context}\n\nQuestion: {query}\n\nPlease provide a comprehensive answer based on the context above. Make sure to cite specific sources in your response."""
        
        try:
            # Use the API processor to generate streaming response
            response = api_processor.processor.send_message_stream(
                model="gpt-4o-mini-2024-07-18",
                system_content=system_prompt,
                human_content=user_prompt
            )
            
            accumulated_text = ""
            chunk_count = 0
            for chunk in response:
                if hasattr(chunk, 'choices') and chunk.choices:
                    delta = chunk.choices[0].delta
                    content = delta.content if hasattr(delta, 'content') else None
                    
                    if content:
                        accumulated_text += content
                        chunk_count += 1
                        yield {"answer": content}
                    
                    # Check if the stream is finished
                    if hasattr(chunk.choices[0], 'finish_reason') and chunk.choices[0].finish_reason:
                        logger.info(f"Stream finished with reason: {chunk.choices[0].finish_reason}, total chunks: {chunk_count}, total length: {len(accumulated_text)}")
                        break
            
            # Log completion stats
            logger.info(f"RAG response completed - Total chunks: {chunk_count}, Total characters: {len(accumulated_text)}")
            
            # Send a completion marker
            if accumulated_text:
                yield {"completion": True, "total_length": len(accumulated_text)}
                        
        except Exception as e:
            logger.error(f"Error in streaming response: {e}", exc_info=True)
            yield {"answer": f"I apologize, but I encountered an error while generating the response: {str(e)}"}
    
    def get_pipeline_status(self, document_set_name: str) -> Dict[str, Any]:
        """Get the current pipeline status for a document set"""
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            documents = Document.objects.filter(document_set=document_set)
            
            return {
                "status": pipeline_obj.status,
                "current_step": pipeline_obj.current_step,
                "progress_percentage": pipeline_obj.progress_percentage,
                "started_at": pipeline_obj.started_at,
                "completed_at": pipeline_obj.completed_at,
                "error_message": pipeline_obj.error_message,
                "document_count": documents.count(),
                "indexed_documents": documents.filter(status='indexed').count(),
                "failed_documents": documents.filter(status='failed').count(),
            }
            
        except (DocumentSet.DoesNotExist, ProcessingPipeline.DoesNotExist):
            return {"status": "not_found", "error": "Document set or pipeline not found"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def list_document_sets(self, user=None) -> List[Dict[str, Any]]:
        """List available document sets for a user"""
        try:
            # If user is provided, filter by access permissions
            if user and hasattr(user, 'role'):
                accessible_sets = DocumentSet.objects.filter(
                    access_controls__role=user.role,
                    access_controls__can_read=True,
                    is_active=True
                )
            else:
                accessible_sets = DocumentSet.objects.filter(is_active=True)
            
            result = []
            for doc_set in accessible_sets:
                try:
                    pipeline = ProcessingPipeline.objects.get(document_set=doc_set)
                    status = pipeline.status
                    progress = pipeline.progress_percentage
                except ProcessingPipeline.DoesNotExist:
                    status = "not_configured"
                    progress = 0
                
                document_count = Document.objects.filter(document_set=doc_set).count()
                
                result.append({
                    "name": doc_set.name,
                    "description": doc_set.description,
                    "status": status,
                    "progress": progress,
                    "document_count": document_count,
                    "created_at": doc_set.created_at,
                    "updated_at": doc_set.updated_at
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error listing document sets: {e}")
            return []
    
    def _parse_pdfs_with_monitoring(self, pipeline, pipeline_obj, data_path: Path, total_documents: int):
        """Parse PDFs with real-time progress monitoring"""
        parsed_dir = data_path / "debug_data" / "01_parsed_reports"
        parsed_dir.mkdir(parents=True, exist_ok=True)
        
        # Handle edge case where total_documents is 0
        if total_documents == 0:
            logger.warning("No documents to parse")
            return
        
        # Monitor parsing progress every few seconds
        def monitor_progress():
            start_time = time.time()
            last_count = 0
            
            while True:
                try:
                    # Count completed parsing files
                    if parsed_dir.exists():
                        parsed_files = list(parsed_dir.glob("*.json"))
                        current_count = len(parsed_files)
                        
                        if current_count > last_count:
                            # Update progress based on parsed files (safe division)
                            if total_documents > 0:
                                progress = 30 + (current_count / total_documents) * 30  # 30-60% for parsing
                                pipeline_obj.progress_percentage = min(int(progress), 60)
                                pipeline_obj.current_step = f"Parsing documents with Docling: {current_count}/{total_documents} completed"
                            else:
                                pipeline_obj.progress_percentage = 50
                                pipeline_obj.current_step = f"Parsing documents with Docling: {current_count} completed"
                            pipeline_obj.save()
                            last_count = current_count
                        
                        # Break if all documents are parsed
                        if current_count >= total_documents:
                            break
                    
                    # Check if we've been running too long (timeout after 30 minutes)
                    if time.time() - start_time > 1800:  # 30 minutes
                        logger.warning("PDF parsing timeout reached")
                        break
                        
                    time.sleep(5)  # Check every 5 seconds
                    
                except Exception as e:
                    logger.error(f"Error monitoring parsing progress: {e}")
                    time.sleep(10)
        
        # Start monitoring in background
        monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
        monitor_thread.start()
        
        # Run the actual PDF parsing
        try:
            pipeline.parse_pdf_reports_sequential()
            
            # Ensure final progress update
            pipeline_obj.progress_percentage = 60
            pipeline_obj.current_step = "PDF parsing completed successfully"
            pipeline_obj.save()
            
        except Exception as e:
            logger.error(f"PDF parsing failed: {e}")
            pipeline_obj.current_step = f"PDF parsing failed: {str(e)}"
            pipeline_obj.save()
            raise
    
    def rebuild_document_set(self, document_set_name: str, clear_parsed: bool = True, clear_database: bool = True) -> bool:
        """Rebuild a document set by clearing vector databases, Django records, and re-running indexing"""
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            # Check if pipeline is currently running
            if pipeline_obj.status in ['parsing', 'indexing']:
                logger.warning(f"Cannot rebuild - pipeline currently running for {document_set_name}")
                return False
            
            logger.info(f"Starting complete rebuild for document set: {document_set_name}")
            
            # Clear Django database records
            if clear_database:
                # Clear chunks
                chunk_count = Chunk.objects.filter(document__document_set=document_set).count()
                if chunk_count > 0:
                    Chunk.objects.filter(document__document_set=document_set).delete()
                    logger.info(f"Cleared {chunk_count} chunks from Django database")
                
                # Clear messages and conversations related to this document set
                from apps.documents.models import Message, Conversation
                # Find conversations that might reference this document set
                related_conversations = Conversation.objects.filter(
                    messages__content__icontains=document_set_name
                ).distinct()
                conversation_count = related_conversations.count()
                if conversation_count > 0:
                    # Optionally clear conversations - comment this out if you want to keep chat history
                    # related_conversations.delete()
                    logger.info(f"Found {conversation_count} conversations that might reference this document set")
            
            # Clear file system data
            data_path = self.get_document_set_path(document_set_name)
            
            # Remove vector databases
            vector_db_dir = data_path / "databases" / "vector_dbs"
            if vector_db_dir.exists():
                import shutil
                shutil.rmtree(vector_db_dir)
                logger.info(f"Cleared vector databases for {document_set_name}")
            
            # Remove chunked reports
            chunked_dir = data_path / "databases" / "chunked_reports"
            if chunked_dir.exists():
                import shutil
                shutil.rmtree(chunked_dir)
                logger.info(f"Cleared chunked reports for {document_set_name}")
            
            # Remove merged reports
            merged_dir = data_path / "databases" / "merged_reports"
            if merged_dir.exists():
                import shutil
                shutil.rmtree(merged_dir)
                logger.info(f"Cleared merged reports for {document_set_name}")
            
            # Clear parsed data to force complete re-processing
            if clear_parsed:
                parsed_dir = data_path / "debug_data"
                if parsed_dir.exists():
                    import shutil
                    shutil.rmtree(parsed_dir)
                    logger.info(f"Cleared all parsed data for {document_set_name}")
                
                # Reset ALL document statuses to uploaded for complete reprocessing
                documents = Document.objects.filter(document_set=document_set)
                document_count = documents.count()
                for doc in documents:
                    doc.status = 'uploaded'
                    doc.error_message = ""
                    doc.processed_at = None
                    doc.pages_count = 0
                    doc.tables_count = 0
                    doc.pictures_count = 0
                    doc.text_blocks_count = 0
                    doc.save()
                logger.info(f"Reset {document_count} documents to uploaded status")
            
            # Reset pipeline status completely
            pipeline_obj.status = 'pending'
            pipeline_obj.progress_percentage = 0
            pipeline_obj.current_step = "Ready for complete rebuild"
            pipeline_obj.error_message = ""
            pipeline_obj.completed_at = None
            pipeline_obj.started_at = None
            pipeline_obj.save()
            
            logger.info(f"Completely reset pipeline and database for {document_set_name}")
            
            # Start rebuilding with force_rebuild=True
            return self.start_pipeline_processing(document_set_name, force_rebuild=True)
            
        except Exception as e:
            logger.error(f"Error rebuilding document set {document_set_name}: {e}")
            return False
    
    def force_reset_pipeline(self, document_set_name: str) -> bool:
        """Force reset a stuck pipeline status"""
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            logger.info(f"Force resetting pipeline for {document_set_name} - was {pipeline_obj.status}")
            
            # Reset pipeline status
            pipeline_obj.status = 'idle'
            pipeline_obj.progress_percentage = 0
            pipeline_obj.current_step = "Pipeline reset"
            pipeline_obj.error_message = ""
            pipeline_obj.save()
            
            # Remove from active pipelines if present
            if document_set_name in self._active_pipelines:
                del self._active_pipelines[document_set_name]
            
            logger.info(f"Successfully reset pipeline for {document_set_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting pipeline for {document_set_name}: {e}")
            return False
    
    def clear_logs(self):
        """Clear processing logs"""
        try:
            # Clear internal logs
            self._logs = []
            logger.info("Processing logs cleared")
            
        except Exception as e:
            logger.error(f"Error clearing logs: {e}")
            raise

    def force_cleanup_all(self) -> dict:
        """Force cleanup of all processing artifacts"""
        try:
            cleanup_results = {
                'pipelines_reset': 0,
                'active_pipelines_cleared': 0,
                'logs_cleared': 0,
                'errors': []
            }
            
            # Reset all non-idle pipelines
            non_idle_pipelines = ProcessingPipeline.objects.exclude(
                status__in=['idle', 'completed']
            )
            
            for pipeline in non_idle_pipelines:
                try:
                    pipeline.status = 'idle'
                    pipeline.progress_percentage = 0
                    pipeline.current_step = "Force reset"
                    pipeline.error_message = ""
                    pipeline.save()
                    cleanup_results['pipelines_reset'] += 1
                except Exception as e:
                    cleanup_results['errors'].append(f"Pipeline {pipeline.document_set.name}: {str(e)}")
            
            # Clear active pipelines tracking
            active_count = len(self._active_pipelines)
            self._active_pipelines.clear()
            cleanup_results['active_pipelines_cleared'] = active_count
            
            # Clear logs
            self._logs = []
            cleanup_results['logs_cleared'] = 1
            
            logger.warning(f"Force cleanup completed: {cleanup_results}")
            return cleanup_results
            
        except Exception as e:
            logger.error(f"Error during force cleanup: {e}")
            raise

# Global instance
rag_manager = AdvancedRAGManager()
