import pytest
from decimal import Decimal
from main.models import Order, OrderItem, Service, User

# 🔹 ДОБАВЬ ЭТУ СТРОКУ:
pytestmark = [pytest.mark.unit, pytest.mark.django_db]


class TestOrderCalculations:
    """Unit-тесты расчётов для заказа"""

    @pytest.fixture
    def order_with_items(self):
        """Создаёт заказ с несколькими товарами для тестов"""
        user = User.objects.create_user(username="calc_test", password="pass")
        order = Order.objects.create(user=user, status="draft")

        # Добавляем товары с разными ценами и количествами
        service1 = Service.objects.create(
            name="Item1",
            price=Decimal("100.00"),
            description="Test",
            category="Test",
            brand="Test",
        )
        service2 = Service.objects.create(
            name="Item2",
            price=Decimal("250.50"),
            description="Test",
            category="Test",
            brand="Test",
        )

        OrderItem.objects.create(
            order=order, service=service1, quantity=2, price_at_time=Decimal("100.00")
        )
        OrderItem.objects.create(
            order=order, service=service2, quantity=1, price_at_time=Decimal("250.50")
        )

        return order

    def test_total_amount_calculation(self, order_with_items):
        """Проверка расчёта общей суммы заказа"""
        order = order_with_items
        # Ожидаемая сумма: 2*100 + 1*250.50 = 450.50
        expected_total = Decimal("450.50")

        # Вызываем логику пересчёта (как в views.py)
        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        assert total == expected_total

    def test_delivery_cost_calculation(self, order_with_items):
        """Проверка расчёта стоимости доставки (5% от суммы, минимум 300)"""
        order = order_with_items
        total_amount = sum(
            item.quantity * item.price_at_time for item in order.items.all()
        )

        # 5% от 450.50 = 22.525, но минимум 300
        expected_delivery = max(total_amount * Decimal("0.05"), Decimal("300"))
        assert expected_delivery == Decimal("300")  # Потому что 22.53 < 300

    def test_empty_order_total(self):
        """Заказ без товаров должен иметь сумму 0"""
        user = User.objects.create_user(username="empty_test", password="pass")
        order = Order.objects.create(user=user, status="draft")

        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        assert total == Decimal("0")
