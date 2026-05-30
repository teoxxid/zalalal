# backend/main/utils.py
from django.contrib.auth import get_user_model

User = get_user_model()


def get_current_user(request=None):
    """Возвращает аутентифицированного пользователя из запроса или None"""
    if request and hasattr(request, "user") and request.user.is_authenticated:
        return request.user
    return None


def get_moderator_user():
    """Возвращает первого пользователя с ролью ADMIN (для модерации)"""
    return User.objects.filter(role="ADMIN").first()
