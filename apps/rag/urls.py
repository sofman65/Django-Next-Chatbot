from django.urls import path
from . import views

app_name = 'rag'

urlpatterns = [
    # RAG Chat endpoints
    path('chat/', views.rag_chat, name='rag_chat'),
    path('chat/<str:document_set_name>/', views.rag_chat_by_set, name='rag_chat_by_set'),
    
    # Document management
    path('upload/', views.upload_document, name='upload_document'),
    path('document-sets/', views.document_sets_management, name='document_sets_management'),
    path('document-sets/list/', views.list_document_sets, name='list_document_sets'),
    path('documents/<str:document_set_name>/', views.document_list, name='document_list'),
    
    # Pipeline management
    path('pipeline/start/', views.start_pipeline, name='start_pipeline'),
    path('pipeline/rebuild/<str:document_set_name>/', views.rebuild_document_set, name='rebuild_document_set'),
    path('pipeline/status/<str:document_set_name>/', views.pipeline_status, name='pipeline_status'),
    
    # System status
    path('system/status/', views.rag_system_status, name='rag_system_status'),
    
    # Admin endpoints
    path('admin/clear-logs/', views.rag_clear_logs, name='rag_clear_logs'),
    path('admin/restart-stuck-pipelines/', views.rag_restart_stuck_pipelines, name='rag_restart_stuck_pipelines'),
    path('admin/force-cleanup/', views.rag_force_cleanup, name='rag_force_cleanup'),
]
