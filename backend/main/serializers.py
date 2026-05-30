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

    class Meta:
        model = OrderItem
        fields = ["id", "service", "quantity", "price_at_time"]


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    moderator = serializers.StringRelatedField()
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = "__all__"


class OrderListSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "user", "status", "submitted_at", "total_amount", "items_count"]


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    