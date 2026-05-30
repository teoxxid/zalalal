import pytest
from rest_framework import status

# 🔹 ДОБАВЬ ЭТУ СТРОКУ:
pytestmark = [pytest.mark.smoke, pytest.mark.django_db]


class TestCriticalPaths:
    """Smoke-тесты критически важных путей"""

    def test_api_health_check(self, api_client):
        """Проверка, что API вообще отвечает"""
        response = api_client.get("/api/services/")
        assert response.status_code == status.HTTP_200_OK

    def test_auth_login_success(self, api_client):
        """Быстрая проверка авторизации"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        User.objects.create_user(username="smoke_test", password="Test123!")

        response = api_client.post(
            "/api/login/",
            {"username": "smoke_test", "password": "Test123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "success"

    def test_auth_login_invalid_credentials(self, api_client):
        """Проверка отклонения неверных данных"""
        response = api_client.post(
            "/api/login/",
            {"username": "nonexistent", "password": "wrongpass"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
