# backend/tests/conftest.py
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .fixtures.factories import (
    UserFactory,
    AdminUserFactory,
    ServiceFactory,
    OrderFactory,
)

User = get_user_model()


@pytest.fixture(scope="function")
def api_client():
    """Базовый API клиент без авторизации"""
    return APIClient()


@pytest.fixture(scope="function")
def authenticated_client():
    """API клиент с авторизованным обычным пользователем"""
    user = UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture(scope="function")
def admin_client():
    """API клиент с авторизованным админом"""
    admin = AdminUserFactory()
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.fixture(scope="function")
def sample_service():
    """Создаёт один тестовый сервис"""
    return ServiceFactory()


@pytest.fixture(scope="function")
def sample_services():
    """Создаёт 5 тестовых сервисов"""
    return ServiceFactory.create_batch(5)


@pytest.fixture(scope="function")
def sample_order(authenticated_client):
    """Создаёт тестовый заказ для авторизованного пользователя"""
    user = authenticated_client.force_authenticate.user
    return OrderFactory(user=user)
