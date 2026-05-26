from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", views.TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    # OAuth
    path("oauth/google/", views.GoogleOAuthView.as_view(), name="oauth-google"),
    path("oauth/google/callback/", views.GoogleCallbackView.as_view(), name="oauth-google-callback"),
    path("oauth/github/", views.GithubOAuthView.as_view(), name="oauth-github"),
    path("oauth/github/callback/", views.GithubCallbackView.as_view(), name="oauth-github-callback"),
]
