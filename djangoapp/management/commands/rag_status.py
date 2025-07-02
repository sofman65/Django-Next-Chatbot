from django.core.management.base import BaseCommand
from djangoapp.models import Document, DocumentSet, ProcessingPipeline, Chunk
from djangoapp.advanced_rag_logic import rag_manager
from pathlib import Path


class Command(BaseCommand):
    help = 'Show status of RAG document sets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--document-set',
            type=str,
            help='Name of specific document set to check (optional)',
        )

    def handle(self, *args, **options):
        document_set_name = options.get('document_set')

        if document_set_name:
            # Show detailed status for specific document set
            self.show_document_set_details(document_set_name)
        else:
            # Show overview of all document sets
            self.show_all_document_sets()

    def show_all_document_sets(self):
        self.stdout.write(self.style.SUCCESS("RAG System Status Overview"))
        self.stdout.write("=" * 50)
        
        document_sets = DocumentSet.objects.all()
        if not document_sets:
            self.stdout.write("No document sets found.")
            return
        
        for doc_set in document_sets:
            try:
                pipeline = ProcessingPipeline.objects.get(document_set=doc_set)
                status = pipeline.status
                progress = pipeline.progress_percentage
            except ProcessingPipeline.DoesNotExist:
                status = "not_configured"
                progress = 0
            
            document_count = Document.objects.filter(document_set=doc_set).count()
            chunk_count = Chunk.objects.filter(document__document_set=doc_set).count()
            
            self.stdout.write(f"\n📁 {doc_set.name}")
            self.stdout.write(f"   Status: {status} ({progress}%)")
            self.stdout.write(f"   Documents: {document_count}")
            self.stdout.write(f"   Chunks: {chunk_count}")

    def show_document_set_details(self, document_set_name):
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
        except DocumentSet.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Document set '{document_set_name}' not found")
            )
            return

        self.stdout.write(self.style.SUCCESS(f"Detailed Status: {document_set_name}"))
        self.stdout.write("=" * 50)
        
        # Pipeline status
        try:
            pipeline = ProcessingPipeline.objects.get(document_set=document_set)
            self.stdout.write(f"Pipeline Status: {pipeline.status}")
            self.stdout.write(f"Progress: {pipeline.progress_percentage}%")
            self.stdout.write(f"Current Step: {pipeline.current_step}")
            if pipeline.error_message:
                self.stdout.write(f"Error: {pipeline.error_message}")
        except ProcessingPipeline.DoesNotExist:
            self.stdout.write("No pipeline configured")
        
        # Documents
        documents = Document.objects.filter(document_set=document_set)
        self.stdout.write(f"\nDocuments: {documents.count()}")
        for doc in documents:
            self.stdout.write(f"  📄 {doc.title} - {doc.status}")
        
        # Chunks
        chunk_count = Chunk.objects.filter(document__document_set=document_set).count()
        self.stdout.write(f"\nChunks: {chunk_count}")
        
        # File system status
        data_path = rag_manager.get_document_set_path(document_set_name)
        vector_db_dir = data_path / "databases" / "vector_dbs"
        chunked_dir = data_path / "databases" / "chunked_reports"
        parsed_dir = data_path / "debug_data" / "01_parsed_reports"
        
        self.stdout.write(f"\nFile System:")
        self.stdout.write(f"  Vector DB: {'✅' if vector_db_dir.exists() else '❌'}")
        self.stdout.write(f"  Chunked Reports: {'✅' if chunked_dir.exists() else '❌'}")
        self.stdout.write(f"  Parsed Reports: {'✅' if parsed_dir.exists() else '❌'}")
        
        if parsed_dir.exists():
            parsed_files = list(parsed_dir.glob("*.json"))
            self.stdout.write(f"  Parsed Files: {len(parsed_files)}")
