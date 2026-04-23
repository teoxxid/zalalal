from django.db import models
from django.contrib.auth.models import AbstractUser


class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.CharField(max_length=255)

    def __str__(self):
        return self.username


class Service(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    image_key = models.CharField(max_length=500, null=True, blank=True)
    video_key = models.CharField(max_length=500, null=True, blank=True)
    category = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    rating = models.DecimalField(max_digits=3, decimal_places=2)
    status = models.CharField(max_length=20, default="active")
    weight = models.DecimalField(max_digits=6, decimal_places=2, default=0.0)

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
        related_name="moderated_orders",
        null=True,
        blank=True,
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_items = models.IntegerField(default=0)
    total_weight = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)

    def __str__(self):
        return f"Заявка #{self.id} - {self.get_status_display()}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="items")
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    quantity = models.IntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ["order", "service"]

    def __str__(self):
        return f"{self.service.name} x{self.quantity}"
