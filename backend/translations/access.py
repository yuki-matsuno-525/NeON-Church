"""Shared visibility policy for translation project work."""

from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404

from .models import TranslationMembership, TranslationProject


def can_view_project_work(user, project: TranslationProject) -> bool:
    """Return whether ``user`` may access work attached to ``project``."""
    if project.status != TranslationProject.STATUS_DRAFT:
        return True
    if not user.is_authenticated:
        return False
    if project.owner_id == user.id:
        return True
    return TranslationMembership.objects.filter(
        project=project,
        user=user,
        status=TranslationMembership.STATUS_APPROVED,
    ).exists()


def get_visible_project_or_404(user, project_id) -> TranslationProject:
    """Resolve a project without disclosing an inaccessible draft's existence."""
    try:
        project = TranslationProject.objects.get(pk=project_id)
    except (TranslationProject.DoesNotExist, DjangoValidationError, TypeError, ValueError):
        raise Http404
    if not can_view_project_work(user, project):
        raise Http404
    return project


def project_visibility_q(user, relation: str) -> Q:
    """Build a visibility predicate for a relation pointing to a project."""
    visible = (
        Q(**{f"{relation}__isnull": True})
        | ~Q(**{f"{relation}__status": TranslationProject.STATUS_DRAFT})
    )
    if user.is_authenticated:
        visible |= (
            Q(**{f"{relation}__owner": user})
            | Q(
                **{
                    f"{relation}__memberships__user": user,
                    f"{relation}__memberships__status": TranslationMembership.STATUS_APPROVED,
                }
            )
        )
    return visible


def filter_by_project_visibility(queryset, user, *relations: str):
    """Apply visibility checks to one or more project relations."""
    for relation in relations:
        queryset = queryset.filter(project_visibility_q(user, relation))
    return queryset.distinct()
