# Endpoint Mapping: Old vs New Structure

## Authentication Endpoints
| **Old Endpoint** | **New Endpoint** | **App** | **Status** |
|------------------|------------------|---------|------------|
| `/api/auth/signup/` | `/api/auth/signup/` | `authapp` | ✅ Moved |
| `/api/auth/login/` | `/api/auth/login/` | `authapp` | ✅ Moved |
| `/api/auth/logout/` | `/api/auth/logout/` | `authapp` | ✅ Moved |
| `/api/auth/refresh/` | `/api/auth/refresh/` | `authapp` | ✅ Moved |
| `/api/auth/user/` | `/api/auth/user/` | `authapp` | ✅ Moved |

## Basic Chat & Documents
| **Old Endpoint** | **New Endpoint** | **App** | **Status** |
|------------------|------------------|---------|------------|
| `/` | `/` | `documents` | ✅ Moved |
| `/api/chat/` | `/api/chat/` | `documents` | ✅ Moved |
| `/api/models/` | `/api/models/` | `documents` | ✅ Moved |
| `/api/conversations/` | `/api/conversations/` | `documents` | ✅ Moved |
| `/api/conversations/create/` | `/api/conversations/create/` | `documents` | ✅ Moved |
| `/api/conversations/<id>/` | `/api/conversations/<id>/` | `documents` | ✅ Moved |
| `/api/db/status/` | `/api/db/status/` | `documents` | ✅ Moved |
| `/api/db/build/` | `/api/db/build/` | `documents` | ✅ Moved |

## RAG & Advanced Features
| **Old Endpoint** | **New Endpoint** | **App** | **Status** |
|------------------|------------------|---------|------------|
| `/api/rag/chat/<document_set>/` | `/api/rag/chat/<document_set>/` | `rag` | ✅ Moved |
| `/api/rag/upload/` | `/api/rag/upload/` | `rag` | ✅ Moved |
| `/api/rag/pipeline/start/` | `/api/rag/pipeline/start/` | `rag` | ✅ Moved |
| `/api/rag/pipeline/rebuild/<document_set>/` | `/api/rag/pipeline/rebuild/<document_set>/` | `rag` | ✅ Moved |
| `/api/rag/pipeline/status/<document_set>/` | `/api/rag/pipeline/status/<document_set>/` | `rag` | ✅ Moved |
| `/api/rag/document-sets/` | `/api/rag/document-sets/` | `rag` | ✅ Moved |
| `/api/rag/document-sets/list/` | `/api/rag/document-sets/list/` | `rag` | ✅ Moved |
| `/api/rag/documents/<document_set>/` | `/api/rag/documents/<document_set>/` | `rag` | ✅ Moved |
| `/api/rag/system/status/` | `/api/rag/system/status/` | `rag` | ✅ Moved |
| `/api/rag/admin/clear-logs/` | `/api/rag/admin/clear-logs/` | `rag` | ✅ Moved |
| `/api/rag/admin/restart-stuck-pipelines/` | `/api/rag/admin/restart-stuck-pipelines/` | `rag` | ✅ Moved |
| `/api/rag/admin/force-cleanup/` | `/api/rag/admin/force-cleanup/` | `rag` | ✅ Moved |

## Legacy Endpoints (Backward Compatibility)
All original endpoints are still available under `/legacy/` prefix:
- `/legacy/api/auth/*` 
- `/legacy/api/chat/`
- `/legacy/api/rag/*`
- etc.

## New Endpoints Added
| **Endpoint** | **App** | **Purpose** |
|--------------|---------|-------------|
| `/api/rag/chat/` | `rag` | General RAG chat (no specific document set) |

## Notes
- ✅ **All endpoints preserved**: No functionality lost in refactoring
- 🔄 **Backward compatible**: Legacy endpoints available during transition
- 📦 **Modular**: Each app handles its domain-specific endpoints
- 🎯 **Clear ownership**: Easy to identify which app owns which endpoint
