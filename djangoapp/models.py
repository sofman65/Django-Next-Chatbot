from django.db import models
from django.utils import timezone

from django.contrib.auth.models import AbstractUser, BaseUserManager


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()

class CustomUserManager(BaseUserManager):
    """Custom user manager for creating users and superusers."""

    def create_user(self, username, email=None, password=None, **extra_fields):
        """Create and return a regular user."""
        if not username:
            raise ValueError('The Username field must be set')

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        # Assign default role for superuser
        if 'role' not in extra_fields or not extra_fields['role']:
            admin_role, created = Role.objects.get_or_create(name="Admin")
            extra_fields['role'] = admin_role

        return self.create_user(username, email, password, **extra_fields)


class CustomUser(AbstractUser):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='users')

    objects = CustomUserManager()

class DocumentSet(models.Model):
    """Groups of documents that form a knowledge base."""
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class DocumentAccess(models.Model):
    """Controls which roles can access which document sets."""
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="document_access")
    document_set = models.ForeignKey(DocumentSet, on_delete=models.CASCADE, related_name="access_controls")
    can_read = models.BooleanField(default=True)
    can_upload = models.BooleanField(default=False)
    can_manage = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['role', 'document_set']
    
    def __str__(self):
        return f"{self.role.name} -> {self.document_set.name}"

class Conversation(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    role = models.CharField(max_length=10)  # 'user' or 'assistant'
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

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