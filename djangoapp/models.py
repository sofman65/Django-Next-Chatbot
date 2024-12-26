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

class DocumentAccess(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="access")
    document_set = models.CharField(max_length=255)  # Name or identifier for the RAG dataset

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
