from .models import User


class UserSingleton:
    """Singleton для получения фиксированного пользователя"""

    _instance = None
    _user = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_user(self):
        """Возвращает фиксированного пользователя"""
        if self._user is None:
            # Ищем существующего пользователя или создаём тестового
            self._user = User.objects.filter(id=1).first()
            if not self._user:
                self._user = User.objects.create_user(
                    username="default_user",
                    password="default123",
                    email="default@example.com",
                )
        return self._user


# Глобальный экземпляр для использования во всех методах
current_user = UserSingleton()
