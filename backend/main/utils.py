from .user_singleton import current_user

def get_current_user():
    """Возвращает фиксированного пользователя (singleton)"""
    return current_user.get_user()

def get_moderator_user():
    """Возвращает модератора (пользователя с ролью ADMIN)"""
    from .models import User
    
    moderator = User.objects.filter(is_superuser=True).first()
    if not moderator:
        moderator = User.objects.create_superuser(
            username='moderator',
            password='moder123',
            email='moder@example.com'
        )
    return moderator