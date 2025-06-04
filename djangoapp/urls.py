# djangoapp/urls.py
from django.urls import path
from . import views
from djangoapp.views import SignupView, LoginView, LogoutView, UserView, TokenRefreshView

urlpatterns = [
    path('', views.index, name="index"),

    # ← add the “/” at the end of each pattern
    path('api/chat/', views.chat, name='chat'),
    path('api/conversations/', views.conversations, name='conversations'),
    path('api/conversations/<int:conversation_id>/', 
         views.conversation_detail, 
         name='conversation_detail'),

    path('api/db/status/', views.db_status, name='db_status'),
    path('api/db/build/',  views.build_db,  name='build_db'),

    # Authentication
    path("api/auth/signup/", SignupView.as_view(),   name="signup"),
    path("api/auth/login/",  LoginView.as_view(),    name="login"),
    path("api/auth/logout/", LogoutView.as_view(),   name="logout"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/user/",    UserView.as_view(),    name="current_user"),
]

