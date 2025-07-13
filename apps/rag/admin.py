from django.contrib import admin
from .models import DocumentSet, Document, ProcessingPipeline, Chunk

@admin.register(DocumentSet)
class DocumentSetAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_set', 'status', 'file_type', 'file_size', 'uploaded_at')
    list_filter = ('status', 'file_type', 'document_set', 'uploaded_at')
    search_fields = ('title', 'sha1_hash')
    readonly_fields = ('uploaded_at', 'processed_at', 'sha1_hash', 'file_size')

@admin.register(ProcessingPipeline)
class ProcessingPipelineAdmin(admin.ModelAdmin):
    list_display = ('document_set', 'status', 'progress_percentage', 'started_at', 'completed_at')
    list_filter = ('status', 'started_at', 'completed_at')
    search_fields = ('document_set__name',)
    readonly_fields = ('started_at', 'completed_at')

@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ('chunk_id', 'document', 'chunk_index', 'page_number', 'created_at')
    list_filter = ('document__document_set', 'page_number', 'created_at')
    search_fields = ('chunk_id', 'text', 'document__title')
    readonly_fields = ('created_at',)
