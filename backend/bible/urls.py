from django.urls import path

from . import views

urlpatterns = [
    path("books/", views.BookListView.as_view(), name="book-list"),
    path("books/<uuid:book_id>/chapters/", views.ChapterListView.as_view(), name="chapter-list"),
    path("chapters/<uuid:chapter_id>/verses/", views.VerseListView.as_view(), name="verse-list"),
    path("verse-of-the-day/", views.VerseOfDayView.as_view(), name="verse-of-day"),
]
