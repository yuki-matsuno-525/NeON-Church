from django.contrib import admin

from .models import Plan, PlanDay, PlanDayReading, PlanSubscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "visibility", "created_at"]
    list_filter = ["visibility"]
    search_fields = ["title", "description"]


@admin.register(PlanDay)
class PlanDayAdmin(admin.ModelAdmin):
    list_display = ["plan", "number", "title"]


@admin.register(PlanDayReading)
class PlanDayReadingAdmin(admin.ModelAdmin):
    list_display = ["day", "canonical_book", "chapter_number", "translation"]


@admin.register(PlanSubscription)
class PlanSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "is_active", "started_at"]
    list_filter = ["is_active"]
