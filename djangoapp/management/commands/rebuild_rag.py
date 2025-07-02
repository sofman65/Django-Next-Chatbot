from django.core.management.base import BaseCommand
from djangoapp.models import Document, DocumentSet, ProcessingPipeline, Chunk
from djangoapp.advanced_rag_logic import rag_manager


class Command(BaseCommand):
    help = 'Clear and rebuild RAG document sets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--document-set',
            type=str,
            help='Name of the document set to rebuild',
            required=True
        )
        parser.add_argument(
            '--clear-all',
            action='store_true',
            help='Clear all data including parsed PDFs (complete rebuild)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--force-reset',
            action='store_true',
            help='Force reset pipeline status if stuck',
        )

    def handle(self, *args, **options):
        document_set_name = options['document_set']
        clear_all = options['clear_all']
        dry_run = options['dry_run']
        force_reset = options['force_reset']

        self.stdout.write(
            self.style.WARNING(f"{'DRY RUN: ' if dry_run else ''}Rebuilding document set: {document_set_name}")
        )

        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            
            # Force reset if requested
            if force_reset and not dry_run:
                self.stdout.write("Force resetting pipeline status...")
                rag_manager.force_reset_pipeline(document_set_name)
            
            # Show what will be cleared
            documents = Document.objects.filter(document_set=document_set)
            chunks = Chunk.objects.filter(document__document_set=document_set)
            
            self.stdout.write(f"Documents found: {documents.count()}")
            self.stdout.write(f"Chunks found: {chunks.count()}")
            
            if dry_run:
                self.stdout.write(self.style.WARNING("DRY RUN: No changes will be made"))
                self.stdout.write(f"Would clear {chunks.count()} chunks")
                if clear_all:
                    self.stdout.write("Would clear all parsed data and reset document statuses")
                if force_reset:
                    self.stdout.write("Would force reset pipeline status")
                return
            
            # Perform the rebuild
            success = rag_manager.rebuild_document_set(
                document_set_name, 
                clear_parsed=clear_all, 
                clear_database=True
            )
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully started rebuild for {document_set_name}")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"Failed to start rebuild for {document_set_name}")
                )
                
        except DocumentSet.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Document set '{document_set_name}' not found")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error: {str(e)}")
            )
