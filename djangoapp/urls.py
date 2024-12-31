from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name="index"),
    path('api/chat', views.chat, name='chat'),
    path('api/conversations', views.conversations, name='conversations'),
    path('api/conversations/<int:conversation_id>', views.conversation_detail, name='conversation_detail'),
    path('api/db/status', views.db_status, name='db_status'),
    path('api/db/build', views.build_db, name='build_db'),
]









