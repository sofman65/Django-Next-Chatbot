import json
import logging
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import DocumentSet, Document, ProcessingPipeline
from apps.documents.models import Conversation, Message
from shared.logic import generate_title, general_chat_query
from shared.advanced_rag_logic import rag_manager

# Configure logger
logger = logging.getLogger(__name__)


@csrf_exempt
def rag_chat(request):
    """Enhanced chat endpoint using advanced RAG"""
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            query = body.get("query", "")
            conversation_id = body.get("conversation_id")
            document_set = body.get("document_set", "default")
            use_advanced_rag = body.get("use_advanced_rag", True)
            
            if not query:
                return JsonResponse({"error": "No query provided"}, status=400)

            # Create or get conversation
            if not conversation_id:
                conversation = Conversation.objects.create(
                    title=generate_title(query)
                )
            else:
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                except Conversation.DoesNotExist:
                    return JsonResponse({"error": "Conversation not found"}, status=404)

            # Save user message
            Message.objects.create(
                conversation=conversation,
                role='user',
                content=query
            )

            def event_stream():
                """Stream tokens from the advanced RAG system or fallback to basic system"""
                try:
                    if use_advanced_rag:
                        # Use advanced RAG system
                        response_content = ""
                        token_count = 0
                        for token_data in rag_manager.query_documents(document_set, query):
                            if "error" in token_data:
                                logger.error(f"RAG error: {token_data['error']}")
                                yield f"data: {json.dumps(token_data)}\n\n"
                                return
                            
                            if "answer" in token_data:
                                response_content += token_data["answer"]
                                token_count += 1
                                yield f"data: {json.dumps(token_data)}\n\n"
                            
                            if "completion" in token_data:
                                logger.info(f"RAG streaming completed - Tokens: {token_count}, Length: {len(response_content)}")
                                yield f"data: {json.dumps(token_data)}\n\n"
                        
                        # Save assistant message
                        if response_content:
                            Message.objects.create(
                                conversation=conversation,
                                role='assistant',
                                content=response_content
                            )
                            logger.info(f"Saved assistant message - Length: {len(response_content)}")
                    else:
                        # Fallback to general chat (no RAG)
                        response_content = ""
                        for token_data in general_chat_query(query):
                            if "answer" in token_data:
                                response_content += token_data["answer"]
                                yield f"data: {json.dumps(token_data)}\n\n"
                        
                        # Save assistant message
                        if response_content:
                            Message.objects.create(
                                conversation=conversation,
                                role='assistant',
                                content=response_content
                            )
                            
                    # Send conversation ID
                    yield f"data: {json.dumps({'conversation_id': str(conversation.id)})}\n\n"
                    
                except Exception as e:
                    logger.error(f"Error during streaming: {e}")
                    yield f"data: {json.dumps({'error': 'An error occurred during processing'})}\n\n"

            return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return JsonResponse({"error": "An error occurred while processing the query"}, status=500)

    return render(request, 'djangoapp/index.html')


@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request):
    """Upload documents for RAG processing"""
    try:
        # Check for multiple files (from frontend) or single file (legacy)
        files = request.FILES.getlist('files') or [request.FILES.get('file')]
        files = [f for f in files if f is not None]  # Filter out None values
        
        if not files:
            return JsonResponse({'error': 'No files provided'}, status=400)
        
        document_set_name = request.POST.get('document_set_name', 'default')
        
        uploaded_documents = []
        
        for file in files:
            # Validate file type
            if not file.name.lower().endswith('.pdf'):
                return JsonResponse({'error': f'Only PDF files are supported. "{file.name}" is not a PDF.'}, status=400)
            
            # Upload document
            document = rag_manager.upload_document(
                document_set_name=document_set_name,
                file=file,
                title=file.name,
                user=request.user if hasattr(request, 'user') else None
            )
            
            uploaded_documents.append({
                'document_id': document.id,
                'title': document.title,
                'status': document.status
            })
        
        return JsonResponse({
            'success': True,
            'document_set': document_set_name,
            'uploaded_documents': uploaded_documents,
            'count': len(uploaded_documents),
            'message': f'Successfully uploaded {len(uploaded_documents)} document(s) to "{document_set_name}". Processing will begin shortly.'
        })
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def start_pipeline(request):
    """Start or restart the RAG processing pipeline for a document set"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        document_set_name = data.get('document_set_name') or data.get('document_set')
        force_rebuild = data.get('force_rebuild', False)
        
        logger.info(f"Start pipeline request for: {document_set_name}, force_rebuild: {force_rebuild}")
        
        if not document_set_name:
            return JsonResponse({'error': 'Document set name is required'}, status=400)
        
        # Check if pipeline is already running
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            if pipeline_obj.status in ['parsing', 'indexing']:
                return JsonResponse({
                    'error': f'Pipeline is already running for {document_set_name}. Current status: {pipeline_obj.current_step or pipeline_obj.status}',
                    'status': pipeline_obj.status,
                    'progress': pipeline_obj.progress_percentage,
                    'current_step': pipeline_obj.current_step
                }, status=400)
                
        except (DocumentSet.DoesNotExist, ProcessingPipeline.DoesNotExist):
            pass  # Will be handled by rag_manager
        
        success = rag_manager.start_pipeline_processing(document_set_name, force_rebuild)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'Pipeline started for {document_set_name}'
            })
        else:
            return JsonResponse({
                'error': 'Failed to start pipeline. It may already be running or completed.'
            }, status=400)
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in start_pipeline: {e}")
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        logger.error(f"Error starting pipeline: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def pipeline_status(request, document_set_name):
    """Get the current status of the RAG pipeline for a document set"""
    try:
        status_data = rag_manager.get_pipeline_status(document_set_name)
        return JsonResponse(status_data)
        
    except Exception as e:
        logger.error(f"Error getting pipeline status: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def list_document_sets(request):
    """List all available document sets"""
    try:
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        document_sets = rag_manager.list_document_sets(user)
        
        return JsonResponse({
            'document_sets': document_sets
        })
        
    except Exception as e:
        logger.error(f"Error listing document sets: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def document_sets_management(request):
    """Manage document sets - create, update, delete"""
    if request.method == 'GET':
        return list_document_sets(request)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description', '')
            
            if not name:
                return JsonResponse({'error': 'Name is required'}, status=400)
            
            document_set, created = DocumentSet.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            
            if created:
                # Create processing pipeline
                ProcessingPipeline.objects.create(
                    document_set=document_set,
                    status='idle'
                )
                
                return JsonResponse({
                    'success': True,
                    'message': f'Document set "{name}" created successfully',
                    'document_set': {
                        'name': document_set.name,
                        'description': document_set.description,
                        'created_at': document_set.created_at
                    }
                })
            else:
                return JsonResponse({
                    'error': f'Document set "{name}" already exists'
                }, status=400)
                
        except Exception as e:
            logger.error(f"Error creating document set: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def document_list(request, document_set_name):
    """List documents in a specific document set"""
    try:
        document_set = DocumentSet.objects.get(name=document_set_name)
        documents = Document.objects.filter(document_set=document_set)
        
        document_list = []
        for doc in documents:
            document_list.append({
                'id': doc.id,
                'title': doc.title,
                'status': doc.status,
                'file_size': doc.file_size,
                'file_type': doc.file_type,
                'uploaded_at': doc.uploaded_at,
                'processed_at': doc.processed_at,
                'pages_count': doc.pages_count,
                'tables_count': doc.tables_count,
                'pictures_count': doc.pictures_count,
                'error_message': doc.error_message
            })
        
        return JsonResponse({
            'document_set': document_set_name,
            'documents': document_list
        })
        
    except DocumentSet.DoesNotExist:
        return JsonResponse({'error': 'Document set not found'}, status=404)
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def rag_system_status(request):
    """Get overall RAG system status"""
    try:
        # Get system-wide statistics
        total_document_sets = DocumentSet.objects.filter(is_active=True).count()
        total_documents = Document.objects.count()
        indexed_documents = Document.objects.filter(status='indexed').count()
        failed_documents = Document.objects.filter(status='failed').count()
        
        active_pipelines = ProcessingPipeline.objects.exclude(
            status__in=['idle', 'completed', 'failed']
        ).count()
        
        return JsonResponse({
            'total_document_sets': total_document_sets,
            'total_documents': total_documents,
            'indexed_documents': indexed_documents,
            'failed_documents': failed_documents,
            'active_pipelines': active_pipelines,
            'processing_percentage': (indexed_documents / total_documents * 100) if total_documents > 0 else 0
        })
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def rebuild_document_set(request, document_set_name):
    """Rebuild a document set by clearing vector databases, Django records, and re-indexing"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.body else {}
            clear_parsed = data.get('clear_parsed', True)  # Default to true for complete rebuild
            clear_database = data.get('clear_database', True)  # Default to true for complete rebuild
            
            logger.info(f"Complete rebuild request for document set: {document_set_name}, clear_parsed: {clear_parsed}, clear_database: {clear_database}")
            
            # Start complete rebuild process
            success = rag_manager.rebuild_document_set(document_set_name, clear_parsed, clear_database)
            
            if success:
                return JsonResponse({
                    'message': f'Complete rebuild started for document set: {document_set_name}',
                    'clear_parsed': clear_parsed,
                    'clear_database': clear_database,
                    'description': 'This will clear all vector databases, Django records, and re-process all documents from scratch.'
                })
            else:
                return JsonResponse({
                    'error': 'Failed to start rebuild. Pipeline may be currently running or document set not found.'
                }, status=400)
                
        except Exception as e:
            logger.error(f"Error in rebuild endpoint: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def rag_clear_logs(request):
    """Clear processing logs"""
    if request.method == 'POST':
        try:
            # Clear logs from the rag_manager
            rag_manager.clear_logs()
            
            # Also clear any Django log records if you have a logging model
            # LogEntry.objects.all().delete()  # Uncomment if you have a log model
            
            logger.info("Processing logs cleared by admin action")
            return JsonResponse({
                'message': 'Processing logs cleared successfully'
            })
            
        except Exception as e:
            logger.error(f"Error clearing logs: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def rag_restart_stuck_pipelines(request):
    """Restart stuck pipelines"""
    if request.method == 'POST':
        try:
            # Find pipelines that have been running for too long
            from django.utils import timezone
            from datetime import timedelta
            
            # Consider pipelines stuck if they've been running for more than 30 minutes
            stuck_threshold = timezone.now() - timedelta(minutes=30)
            
            stuck_pipelines = ProcessingPipeline.objects.filter(
                status__in=['parsing', 'indexing', 'processing'],
                started_at__lt=stuck_threshold
            )
            
            restarted_count = 0
            for pipeline in stuck_pipelines:
                try:
                    # Force reset this pipeline
                    rag_manager.force_reset_pipeline(pipeline.document_set.name)
                    restarted_count += 1
                    logger.info(f"Restarted stuck pipeline for document set: {pipeline.document_set.name}")
                except Exception as e:
                    logger.error(f"Failed to restart pipeline for {pipeline.document_set.name}: {e}")
            
            return JsonResponse({
                'message': f'Restarted {restarted_count} stuck pipelines',
                'restarted_count': restarted_count
            })
            
        except Exception as e:
            logger.error(f"Error restarting stuck pipelines: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def rag_force_cleanup(request):
    """Force cleanup of all processing artifacts"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.body else {}
            confirm = data.get('confirm', False)
            
            if not confirm:
                return JsonResponse({
                    'error': 'This is a destructive operation. Please set confirm=true to proceed.'
                }, status=400)
            
            # Force cleanup all processing artifacts
            cleanup_results = rag_manager.force_cleanup_all()
            
            logger.warning("Force cleanup of all processing artifacts performed by admin action")
            
            return JsonResponse({
                'message': 'Force cleanup completed',
                'cleanup_results': cleanup_results
            })
            
        except Exception as e:
            logger.error(f"Error during force cleanup: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def rag_chat_by_set(request, document_set_name: str):
    """
    Handles RAG chat requests for a specific document set,
    streaming the response using Server-Sent Events (SSE).
    """
    q = request.GET.get("q")
    if not q:
        return JsonResponse({"error": "Missing required 'q' parameter"}, status=400)

    def event_stream():
        """Generator function to stream chunks from the RAG manager."""
        try:
            for chunk in rag_manager.query_documents(document_set_name, q, user=request.user):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            # Log the error and yield an error event if something goes wrong
            logger.error(f"Error during event stream for {document_set_name}: {e}")
            error_chunk = {"error": "An error occurred while processing your request."}
            yield f"data: {json.dumps(error_chunk)}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["X-Accel-Buffering"] = "no"  # Disable buffering for Nginx
    response["Cache-Control"] = "no-cache" # Ensure no caching
    return response
