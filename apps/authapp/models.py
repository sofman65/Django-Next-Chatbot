from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField()

    def __str__(self):
        return self.name


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
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='users', null=True, blank=True)

    objects = CustomUserManager()

    def __str__(self):
        return self.username


class DocumentAccess(models.Model):
    """Controls which roles can access which document sets."""
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="document_access")
    # Import will be handled in views when needed to avoid circular imports
    # document_set = models.ForeignKey('rag.DocumentSet', on_delete=models.CASCADE, related_name="access_controls")
    can_read = models.BooleanField(default=True)
    can_upload = models.BooleanField(default=False)
    can_manage = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['role']  # Remove document_set for now to avoid circular import
    
    def __str__(self):
        return f"{self.role.name} permissions"
