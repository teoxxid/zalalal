from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from decimal import Decimal
import logging

cache_logger = logging.getLogger("cache")


class User(AbstractUser):
    ROLE_CHOICES = (
        ("USER", "User"),
        ("ADMIN", "Admin"),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="USER")
    is_moderator = models.BooleanField(default=False)

    def __str__(self):
        return self.username


class Service(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    description = models.TextField()
    image_key = models.CharField(max_length=500, null=True, blank=True)
    video_key = models.CharField(max_length=500, null=True, blank=True)
    category = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    status = models.CharField(max_length=20, default="active")
    weight = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.0, validators=[MinValueValidator(Decimal("0"))]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS_CHOICES = [
        ("draft", "Черновик"),
        ("deleted", "Удалён"),
        ("submitted", "Сформирован"),
        ("completed", "Завершён"),
        ("rejected", "Отклонён"),
    ]
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    moderator = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="moderated_orders",
    )
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))]
    )
    total_items = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    total_weight = models.DecimalField(
        max_digits=8, decimal_places=2, default=0.0, validators=[MinValueValidator(Decimal("0"))]
    )
    delivery_address = models.TextField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    delivery_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))]
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Заявка #{self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="items")
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    price_at_time = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    class Meta:
        unique_together = ["order", "service"]
        ordering = ["id"]

    def __str__(self):
        return f"{self.service.name} x{self.quantity}"


@receiver([post_save, post_delete], sender=Service)
def invalidate_service_cache(sender, instance, **kwargs):
    try:
        try:
            keys_to_delete = cache.keys("services_list:*")
            if keys_to_delete:
                cache.delete_many(keys_to_delete)
                cache_logger.warning(
                    f"CACHE INVALIDATE | pattern=services_list:* | deleted={len(keys_to_delete)} keys"
                )
            else:
                cache_logger.info(f"CACHE INVALIDATE | pattern=services_list:* | no keys found")
        except AttributeError:
            cache_logger.info("CACHE INVALIDATE | skipping pattern invalidation (DummyCache)")

        detail_key = f"service_detail:{instance.id}"
        if cache.delete(detail_key):
            cache_logger.warning(f"CACHE INVALIDATE | key={detail_key}")
        else:
            cache_logger.info(f"CACHE INVALIDATE | key={detail_key} | not found")
    except Exception as e:
        cache_logger.error(f"CACHE ERROR | invalidation failed | error={str(e)}")
        