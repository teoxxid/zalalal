from rest_framework import serializers

from .models import Order, OrderItem, Service


class ServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "price",
            "description",
            "image_url",
            "category",
            "brand",
            "rating",
        ]

    def get_image_url(self, obj):
        return f"http://localhost:9000/services/{obj.image_key}"


class OrderItemSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "service", "quantity", "price_at_time"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="orderitem_set", many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "created_at", "total_amount", "items"]
