from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "recipient", "actor", "notification_type", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "recipient", "actor", "notification_type", "comment", "created_at", "updated_at"]
