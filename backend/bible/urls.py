from django.urls import path

from . import views

urlpatterns = [
    path("books/", views.BookListView.as_view(), name="book-list"),
    path("books/<uuid:book_id>/chapters/", views.ChapterListView.as_view(), name="chapter-list"),
    path("chapters/<uuid:chapter_id>/verses/", views.VerseListView.as_view(), name="verse-list"),
    # 箇所（canonical slug）→ 各版の書/章/節をまとめて返す（N+1 解消）
    path("references/<slug:slug>/books/", views.ReferenceBooksView.as_view(), name="reference-books"),
    path("references/<slug:slug>/chapters/<int:chapter>/", views.ReferenceChaptersView.as_view(), name="reference-chapters"),
    path("references/<slug:slug>/verses/<int:chapter>/<int:verse>/", views.ReferenceVersesView.as_view(), name="reference-verses"),
    path("verse-of-the-day/", views.VerseOfDayView.as_view(), name="verse-of-day"),
    path("search/", views.SearchView.as_view(), name="search"),
]
