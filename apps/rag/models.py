from django.db import models
from django.utils import timezone


class DocumentSet(models.Model):
    """Groups of documents that form a knowledge base."""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name


class Document(models.Model):
    """Stores uploaded knowledge base documents for RAG."""
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('parsing', 'Parsing'),
        ('parsed', 'Parsed'),
        ('processing', 'Processing'),
        ('indexed', 'Indexed'),
        ('failed', 'Failed'),
    ]
    
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="docs/%Y/%m/%d/")
    document_set = models.ForeignKey(DocumentSet, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    file_size = models.PositiveIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=50, blank=True)
    sha1_hash = models.CharField(max_length=40, unique=True, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Advanced RAG metadata
    pages_count = models.PositiveIntegerField(null=True, blank=True)
    tables_count = models.PositiveIntegerField(null=True, blank=True)
    pictures_count = models.PositiveIntegerField(null=True, blank=True)
    text_blocks_count = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


class ProcessingPipeline(models.Model):
    """Tracks the processing pipeline status for document sets."""
    STATUS_CHOICES = [
        ('idle', 'Idle'),
        ('parsing', 'Parsing PDFs'),
        ('merging', 'Merging Reports'),
        ('chunking', 'Chunking Documents'),
        ('indexing', 'Creating Vector Index'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    document_set = models.OneToOneField(DocumentSet, on_delete=models.CASCADE, related_name='pipeline')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    current_step = models.CharField(max_length=100, blank=True)
    progress_percentage = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Pipeline configuration
    use_serialized_tables = models.BooleanField(default=False)
    parent_document_retrieval = models.BooleanField(default=True)
    llm_reranking = models.BooleanField(default=True)
    top_n_retrieval = models.PositiveIntegerField(default=20)
    
    def __str__(self):
        return f"{self.document_set.name} - {self.status}"


class Chunk(models.Model):
    """Stores chunked text from documents, used in vector search."""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_id = models.CharField(max_length=100, unique=True)
    text = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    chunk_index = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Vector similarity scores
    embedding_vector = models.TextField(blank=True)  # JSON serialized vector
    
    class Meta:
        unique_together = ['document', 'chunk_index']
        indexes = [
            models.Index(fields=['document', 'page_number']),
            models.Index(fields=['chunk_id']),
        ]

    def __str__(self):
        return f"{self.document.title} - Chunk {self.chunk_index}"
