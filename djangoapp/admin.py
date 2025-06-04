from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Role, CustomUser, DocumentAccess, Conversation, Message, Document,Chunk

# Customizing the display of the Role model
@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')  # Columns to display
    search_fields = ('name',)              # Add search functionality
    list_filter = ('name',)                # Add filters

# Customizing the display of the CustomUser model
@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email')  # Enable search for these fields
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')  # Add filters

# Customizing the display of the DocumentAccess model
@admin.register(DocumentAccess)
class DocumentAccessAdmin(admin.ModelAdmin):
    list_display = ('role', 'document_set')  # Columns to display
    list_filter = ('role',)                  # Filter by role

# Adding inline display of messages for Conversations
class MessageInline(admin.TabularInline):
    model = Message
    extra = 0  # No empty rows by default

# Customizing the display of the Conversation model
@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')  # Columns to display
    search_fields = ('title',)              # Enable search
    list_filter = ('created_at',)           # Add filters
    inlines = [MessageInline]               # Show messages inline within conversations

# Customizing the display of the Message model
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'role', 'content', 'created_at')  # Columns to display
    search_fields = ('content',)                                     # Enable search for content
    list_filter = ('role', 'created_at')                             # Add filters


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'uploaded_at', 'file')
    search_fields = ('title',)
    list_filter = ('uploaded_at',)

@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ('document', 'chunk_id', 'created_at')
    search_fields = ('chunk_id', 'text')
    list_filter = ('document',)
