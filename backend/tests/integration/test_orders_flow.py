# backend/tests/integration/test_orders_flow.py
import pytest
from rest_framework import status
from main.models import Order, OrderItem, Service, User
from decimal import Decimal

pytestmark = [pytest.mark.integration, pytest.mark.django_db, pytest.mark.orders]


class TestOrderCreationFlow:
    """Integration-тесты полного сценария создания заказа"""

    @pytest.fixture
    def authenticated_user(self):
        user = User.objects.create_user(
            username='test_order_user',
            password='testpass123',
            email='test@example.com',
            role='USER'
        )
        return user

    @pytest.fixture
    def authenticated_client(self, client, authenticated_user):
        """Клиент с авторизованным пользователем"""
        client.force_login(authenticated_user)
        return client

    @pytest.fixture
    def sample_service(self):
        """Фикстура: тестовый товар"""
        return Service.objects.create(
            name='Test Service',
            price=Decimal('100.00'),
            description='Test description',
            category='Test',
            brand='TestBrand',
            status='active'
        )

    def test_create_order_item_success(self, authenticated_client, authenticated_user, sample_service):
        """✅ Позитивный сценарий: добавление товара в заказ"""
        payload = {"service_id": sample_service.id, "quantity": 2}

        # 🔹 ИСПРАВЛЕНО: order-items (множественное), как в urls.py
        response = authenticated_client.post(
            "/api/order-items/add/", payload, format="json"  # ← ITEMS, не ITEM!
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert response.json()["data"]["quantity"] == 2

        order = Order.objects.get(user=authenticated_user, status="draft")
        assert order.items.count() == 1
        assert order.items.first().quantity == 2
        assert order.items.first().price_at_time == Decimal('100.00')

    def test_create_order_item_unauthorized(self, client, sample_service):
        """❌ Негативный сценарий: добавление товара без авторизации"""
        payload = {"service_id": sample_service.id, "quantity": 1}

        # 🔹 ИСПРАВЛЕНО: order-items (множественное)
        response = client.post("/api/order-items/add/", payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_order_total_updates_on_item_add(self, authenticated_client, authenticated_user):
        """✅ Проверка, что total_amount обновляется при добавлении товара"""
        service = Service.objects.create(
            name="TestItem",
            price=Decimal("150.00"),
            description="Test",
            category="Test",
            brand="Test",
            status="active"
        )

        # 🔹 ИСПРАВЛЕНО: order-items (множественное)
        payload1 = {"service_id": service.id, "quantity": 2}
        response = authenticated_client.post("/api/order-items/add/", payload1, format="json")
        
        assert response.status_code == status.HTTP_201_CREATED

        order = Order.objects.get(user=authenticated_user, status="draft")
        expected_total = Decimal("300.00")
        assert order.total_amount == expected_total
        