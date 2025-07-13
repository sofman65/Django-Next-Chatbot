from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    path('', views.index, name="index"),

    # Basic chat endpoints
    path('api/chat/', views.chat, name='chat'),
    path('api/models/', views.supported_models, name='supported_models'),
    path('api/conversations/', views.conversations, name='conversations'),
    path('api/conversations/create/', views.create_conversation, name='create_conversation'),
    path('api/conversations/<int:conversation_id>/', 
         views.conversation_detail, 
         name='conversation_detail'),

    # Basic database endpoints
    path('api/db/status/', views.db_status, name='db_status'),
    path('api/db/build/',  views.build_db,  name='build_db'),
]
