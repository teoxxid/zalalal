from rest_framework import serializers
from .models import Order, OrderItem, Service, User


class ServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "price",
            "description",
            "image_url",
            "video_url",
            "category",
            "brand",
            "rating",
        ]

    def get_image_url(self, obj):
        if obj.image_key:
            return f"http://localhost:9000/services/{obj.image_key}"
        return None

    def get_video_url(self, obj):
        if obj.video_key:
            return f"http://localhost:9000/services/{obj.video_key}"
        return None


class OrderItemSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_price = serializers.DecimalField(
        source="service.price", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "service",
            "service_id",
            "service_name",
            "service_price",
            "quantity",
            "price_at_time",
        ]


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    moderator = serializers.StringRelatedField()
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = "__all__"


class OrderListSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "created_at",
            "submitted_at",
            "completed_at",
            "total_amount",
            "total_items",
            "items_count",
        ]

    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "username": obj.user.username,
            "email": obj.user.email,
        }


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
