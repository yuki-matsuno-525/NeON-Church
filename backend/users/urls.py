from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", views.TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("settings/", views.AccountSettingsView.as_view(), name="account-settings"),
    path("settings/identity/", views.IdentityUpdateView.as_view(), name="account-identity"),
    path(
        "settings/preferences/",
        views.NotificationPreferencesView.as_view(),
        name="account-preferences",
    ),
    path("settings/password/", views.PasswordChangeView.as_view(), name="account-password"),
    path("settings/sessions/", views.SessionListView.as_view(), name="account-sessions"),
    path(
        "settings/sessions/revoke-others/",
        views.RevokeOtherSessionsView.as_view(),
        name="account-sessions-revoke-others",
    ),
    path(
        "settings/sessions/<str:jti>/",
        views.SessionRevokeView.as_view(),
        name="account-session-revoke",
    ),
    path("settings/account/", views.AccountDeletionView.as_view(), name="account-delete"),
    path(
        "password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset-request"
    ),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    # OAuth
    path("oauth/google/", views.GoogleOAuthView.as_view(), name="oauth-google"),
    path(
        "oauth/google/callback/", views.GoogleCallbackView.as_view(), name="oauth-google-callback"
    ),
    path("oauth/github/", views.GithubOAuthView.as_view(), name="oauth-github"),
    path(
        "oauth/github/callback/", views.GithubCallbackView.as_view(), name="oauth-github-callback"
    ),
]
