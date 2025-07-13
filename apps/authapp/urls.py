from django.urls import path
from . import views

app_name = 'authapp'

urlpatterns = [
    path("signup/", views.SignupView.as_view(), name="signup"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", views.TokenRefreshView.as_view(), name="token_refresh"),
    path("user/", views.UserView.as_view(), name="current_user"),
]
