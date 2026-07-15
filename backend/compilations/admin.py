from django.contrib import admin

from .models import CompiledBook, CompiledChapter, CompiledComment, CompiledVerse, MotifTag


admin.site.register(MotifTag)
admin.site.register(CompiledBook)
admin.site.register(CompiledChapter)
admin.site.register(CompiledVerse)
admin.site.register(CompiledComment)
