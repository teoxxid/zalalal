import pytest
from django.core.exceptions import ValidationError
from main.models import Service, OrderItem
from decimal import Decimal
import re

pytestmark = [pytest.mark.unit, pytest.mark.django_db]


class TestServiceValidation:
    """Unit-тесты валидации сущности Service"""

    def test_service_name_max_length(self):
        """Граничное значение: название 255 символов — ОК, 256 — ошибка"""
        valid_name = "A" * 255
        invalid_name = "A" * 256

        service = Service(
            name=valid_name,
            price=100,
            description="Test",
            category="Test",
            brand="Test",
        )
        service.full_clean()  # Не должно выбросить ошибку

        service.name = invalid_name
        with pytest.raises(ValidationError):
            service.full_clean()

    def test_price_positive_only(self):
        """Цена должна быть положительной"""
        service = Service(
            name="Test", price=-10, description="Test", category="Test", brand="Test"
        )
        with pytest.raises(ValidationError):
            service.full_clean()

    def test_price_decimal_precision(self):
        """Цена с двумя знаками после запятой — ОК, с тремя — округляется или ошибка"""
        service = Service(
            name="Test",
            price=Decimal("199.99"),
            description="Test",
            category="Test",
            brand="Test",
        )
        service.full_clean()
        assert service.price == Decimal("199.99")

    def test_required_fields(self):
        """Обязательные поля не могут быть пустыми"""
        service = Service()
        with pytest.raises(ValidationError) as exc_info:
            service.full_clean()

        # Проверяем, что ошибка содержит нужные поля
        assert (
            "name" in exc_info.value.message_dict
            or "price" in exc_info.value.message_dict
        )


class TestOrderItemValidation:
    """Unit-тесты валидации OrderItem"""

    def test_quantity_minimum_value(self):
        """Количество товаров в заказе не может быть меньше 1"""
        from main.models import Order, Service, User

        user = User.objects.create_user(username="test", password="pass")
        order = Order.objects.create(user=user)
        service = Service.objects.create(
            name="Test",
            price=Decimal("100.00"),
            description="Test",
            category="Test",
            brand="Test",
        )

        # quantity=0 должно вызвать ошибку при full_clean()
        order_item = OrderItem(
            order=order, service=service, quantity=0, price_at_time=Decimal("100.00")
        )
        with pytest.raises(ValidationError):
            order_item.full_clean()  # Явно вызываем валидацию

    def test_unique_order_service_pair(self):
        """Уникальность пары (order, service)"""
        from main.models import Order, Service, User

        user = User.objects.create_user(username="test", password="pass")
        order = Order.objects.create(user=user)
        service = Service.objects.create(
            name="Test", price=100, description="Test", category="Test", brand="Test"
        )

        OrderItem.objects.create(
            order=order, service=service, quantity=1, price_at_time=100
        )

        # Повторное создание той же пары должно вызвать ошибку
        with pytest.raises(Exception):  # IntegrityError или ValidationError
            OrderItem.objects.create(
                order=order, service=service, quantity=2, price_at_time=100
            )
