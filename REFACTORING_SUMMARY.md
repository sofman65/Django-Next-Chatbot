# Django Project Refactoring: Modular App Structure

## Overview
This refactoring organizes the Django backend into 3 clear, domain-focused apps under `/apps/`:

## New App Structure

### 📁 `/apps/authapp/` - Authentication & User Management
**Purpose**: Handles all user authentication, authorization, and user management

**Endpoints**:
- `/api/auth/signup/` - User registration
- `/api/auth/login/` - User login
- `/api/auth/logout/` - User logout
- `/api/auth/refresh/` - JWT token refresh
- `/api/auth/user/` - Get current user info

**Models**:
- `CustomUser` - Extended user model with role support
- `Role` - User roles for access control
- `DocumentAccess` - Role-based document access permissions

### 📁 `/apps/documents/` - Document & Chat Management
**Purpose**: Handles basic chat, conversations, and general document operations

**Endpoints**:
- `/` - Main chat interface
- `/api/chat/` - Basic chat without RAG
- `/api/conversations/` - Conversation management
- `/api/conversations/create/` - Create new conversation
- `/api/conversations/<id>/` - Get conversation details
- `/api/models/` - Get supported AI models
- `/api/db/status/` - Database status
- `/api/db/build/` - Build database

**Models**:
- `Conversation` - Chat conversation sessions
- `Message` - Individual chat messages

### 📁 `/apps/rag/` - RAG Features & Vector Search
**Purpose**: Handles advanced RAG functionality, document processing, and vector search

**Endpoints**:
- `/api/rag/chat/` - RAG-enabled chat
- `/api/rag/chat/<document_set>/` - Document-set-specific chat
- `/api/rag/upload/` - Document upload
- `/api/rag/document-sets/` - Document set management
- `/api/rag/documents/<document_set>/` - List documents in set
- `/api/rag/pipeline/start/` - Start processing pipeline
- `/api/rag/pipeline/status/<document_set>/` - Pipeline status
- `/api/rag/pipeline/rebuild/<document_set>/` - Rebuild document set
- `/api/rag/system/status/` - Overall system status
- `/api/rag/admin/*` - Admin operations

**Models**:
- `DocumentSet` - Groups of documents forming knowledge bases
- `Document` - Individual uploaded documents
- `ProcessingPipeline` - Tracks document processing status
- `Chunk` - Document chunks for vector search

## Migration Strategy

### Phase 1: ✅ Completed
1. ✅ Created modular app structure under `/apps/`
2. ✅ Moved models to appropriate apps
3. ✅ Moved views to appropriate apps  
4. ✅ Created app-specific URL patterns
5. ✅ Updated main project URLs
6. ✅ Updated Django settings

### Phase 2: Next Steps
1. **Fix Import Issues**: Update imports between apps to work properly
2. **Run Migrations**: Create and apply database migrations
3. **Test Endpoints**: Verify all endpoints work after refactoring
4. **Update Frontend**: Update frontend to use new endpoint structure
5. **Deprecate Legacy**: Phase out old `djangoapp` endpoints

## Key Benefits

### 🎯 **Clear Separation of Concerns**
- Authentication logic isolated in `authapp`
- Basic chat/document features in `documents`
- Advanced RAG functionality in `rag`

### 🔧 **Improved Maintainability**
- Smaller, focused codebases per domain
- Easier to locate and modify specific functionality
- Reduced coupling between different features

### 📈 **Better Scalability**
- Can scale teams by domain area
- Easier to add new features within domains
- Can potentially split into microservices later

### 🧪 **Enhanced Testing**
- Domain-specific test suites
- Easier to mock dependencies
- More focused integration tests

## Current Status

- ✅ **Structure Created**: All apps and basic structure in place
- ⚠️ **Import Issues**: Some cross-app imports need fixing
- ⚠️ **Migrations Needed**: Database migrations need to be created and run
- ⚠️ **Testing Required**: Need to test all endpoints after refactoring

## Backward Compatibility

The original `djangoapp` endpoints are preserved under `/legacy/` prefix to ensure existing frontend continues working during transition period.

## Next Steps

1. Fix remaining import issues in `advanced_rag_logic.py`
2. Create database migrations for the new app structure
3. Test all endpoints to ensure functionality is preserved
4. Update frontend to use new modular endpoints
5. Remove legacy endpoints once transition is complete
