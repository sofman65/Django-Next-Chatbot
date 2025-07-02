# djangoapp/urls.py
from django.urls import path
from . import views
from djangoapp.views import SignupView, LoginView, LogoutView, UserView, TokenRefreshView

urlpatterns = [
    path('', views.index, name="index"),

    # Basic chat endpoints
    path('api/chat/', views.chat, name='chat'),
    path('api/conversations/', views.conversations, name='conversations'),
    path('api/conversations/create/', views.create_conversation, name='create_conversation'),
    path('api/conversations/<int:conversation_id>/', 
         views.conversation_detail, 
         name='conversation_detail'),

    # Basic database endpoints
    path('api/db/status/', views.db_status, name='db_status'),
    path('api/db/build/',  views.build_db,  name='build_db'),

    # Advanced RAG endpoints
    path('api/rag/chat/', views.rag_chat, name='rag_chat'),
    path('api/rag/upload/', views.upload_document, name='upload_document'),
    path('api/rag/pipeline/start/', views.start_pipeline, name='start_pipeline'),
    path('api/rag/pipeline/rebuild/<str:document_set_name>/', views.rebuild_document_set, name='rebuild_document_set'),
    path('api/rag/pipeline/status/<str:document_set_name>/', views.pipeline_status, name='pipeline_status'),
    path('api/rag/document-sets/', views.document_sets_management, name='document_sets_management'),
    path('api/rag/document-sets/list/', views.list_document_sets, name='list_document_sets'),
    path('api/rag/documents/<str:document_set_name>/', views.document_list, name='document_list'),
    path('api/rag/system/status/', views.rag_system_status, name='rag_system_status'),
    
    # Admin endpoints
    path('api/rag/admin/clear-logs/', views.rag_clear_logs, name='rag_clear_logs'),
    path('api/rag/admin/restart-stuck-pipelines/', views.rag_restart_stuck_pipelines, name='rag_restart_stuck_pipelines'),
    path('api/rag/admin/force-cleanup/', views.rag_force_cleanup, name='rag_force_cleanup'),

    # Authentication
    path("api/auth/signup/", SignupView.as_view(),   name="signup"),
    path("api/auth/login/",  LoginView.as_view(),    name="login"),
    path("api/auth/logout/", LogoutView.as_view(),   name="logout"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/user/",    UserView.as_view(),    name="current_user"),
]


