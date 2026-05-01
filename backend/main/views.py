import logging
import uuid
import re
from datetime import timedelta

from django.db.models import Q, Count
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiTypes
from django.views.decorators.csrf import csrf_exempt

from .models import Order, OrderItem, Service, User
from .serializers import (
    ServiceSerializer,
    OrderSerializer,
    OrderListSerializer,
    OrderItemSerializer,
    UserSerializer,
)
from .utils import get_current_user, get_moderator_user

logger = logging.getLogger(__name__)

# ========== HTML СТРАНИЦЫ ==========


def index(request):
    services = Service.objects.filter(status="active")[:4]
    for service in services:
        service.image_url = f"http://localhost:9000/services/{service.image_key}"

    try:
        user = get_current_user()
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
    except (User.DoesNotExist, Order.DoesNotExist):
        current_order = None
        cart_items_count = 0

    background_video_url = "http://localhost:9000/services/background.mp4"

    context = {
        "isError": False,
        "error": None,
        "data": {
            "services": services,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
            "background_video_url": background_video_url,
        },
    }
    return render(request, "main/index.html", context)


def service_list(request):
    """Каталог товаров"""
    search_query = request.GET.get("search", "")
    services = Service.objects.filter(status="active")

    if search_query:
        services = services.filter(
            Q(name__icontains=search_query) | Q(category__icontains=search_query)
        )

    for service in services:
        service.image_url = f"http://localhost:9000/services/{service.image_key}"

    user = get_current_user()

    try:
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
    except Order.DoesNotExist:
        current_order = None
        cart_items_count = 0

    context = {
        "isError": False,
        "error": None,
        "data": {
            "services": services,
            "search_query": search_query,
            "cart_items_count": cart_items_count,
            "current_order": current_order,
        },
    }
    return render(request, "main/service_list.html", context)


def service_detail(request, service_id):
    service = get_object_or_404(Service, id=service_id, status="active")
    service.image_url = f"http://localhost:9000/services/{service.image_key}"
    service.video_url = (
        f"http://localhost:9000/services/{service.video_key}"
        if service.video_key
        else None
    )

    user = get_current_user()

    try:
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
    except Order.DoesNotExist:
        current_order = None
        cart_items_count = 0

    context = {
        "isError": False,
        "error": None,
        "data": {
            "service": service,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    }
    return render(request, "main/service_detail.html", context)


def order_detail(request, order_id):
    """Страница заявки"""
    order = get_object_or_404(Order, id=order_id)

    if order.status == "deleted":
        return render(request, "main/order_deleted.html", {"order_id": order_id})

    order_items = OrderItem.objects.filter(order=order).select_related("service")

    for item in order_items:
        item.service.image_url = (
            f"http://localhost:9000/services/{item.service.image_key}"
        )

    user = get_current_user()

    try:
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
    except Order.DoesNotExist:
        current_order = None
        cart_items_count = 0

    context = {
        "isError": False,
        "error": None,
        "data": {
            "order": order,
            "order_items": order_items,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    }
    return render(request, "main/order_detail.html", context)


def order_list(request):
    """Список всех заявок"""
    user = get_current_user()

    orders = Order.objects.filter(user=user).order_by("-created_at")

    try:
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
    except Order.DoesNotExist:
        current_order = None
        cart_items_count = 0

    context = {
        "isError": False,
        "error": None,
        "data": {
            "orders": orders,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    }
    return render(request, "main/order_list.html", context)


def add_to_order(request, service_id):
    """Добавление товара в заявку (HTML POST)"""
    if request.method == "POST":
        user = get_current_user()

        order, created = Order.objects.get_or_create(
            user=user,
            status="draft",
            defaults={"created_at": timezone.now(), "total_amount": 0},
        )

        service = get_object_or_404(Service, id=service_id, status="active")

        order_item, item_created = OrderItem.objects.get_or_create(
            order=order,
            service=service,
            defaults={"quantity": 1, "price_at_time": service.price},
        )

        if not item_created:
            order_item.quantity += 1
            order_item.save()

        total = sum(
            item.quantity * item.price_at_time
            for item in OrderItem.objects.filter(order=order)
        )
        order.total_amount = total
        order.save()

        return redirect("order_detail", order_id=order.id)

    return HttpResponse(status=405)


def delete_order(request, order_id):
    """Логическое удаление заявки (HTML POST)"""
    if request.method == "POST":
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE main_order SET status = 'deleted' WHERE id = %s", [order_id]
            )

        return redirect("order_list")

    return HttpResponse(status=405)


def complete_order(request, order_id):
    """Завершение заказа с расчетом (HTML POST)"""
    if request.method == "POST":
        order = get_object_or_404(Order, id=order_id)
        order_items = OrderItem.objects.filter(order=order).select_related("service")

        total_items = 0
        total_weight = 0.0

        for item in order_items:
            total_items += item.quantity
            total_weight += float(item.service.weight) * item.quantity

        order.status = "completed"
        order.completed_at = timezone.now()
        order.total_items = total_items
        order.total_weight = round(total_weight, 2)
        order.save()

        return redirect("order_detail", order_id=order.id)

    return HttpResponse(status=405)


# ========== API ЭНДПОИНТЫ ==========


@csrf_exempt
@api_view(["GET"])
def api_service_list(request):
    """GET список услуг с фильтрацией"""
    services = Service.objects.filter(status="active")

    name_filter = request.query_params.get("name")
    if name_filter:
        services = services.filter(name__icontains=name_filter)

    category_filter = request.query_params.get("category")
    if category_filter:
        services = services.filter(category__icontains=category_filter)

    price_min = request.query_params.get("price_min")
    if price_min:
        services = services.filter(price__gte=price_min)

    price_max = request.query_params.get("price_max")
    if price_max:
        services = services.filter(price__lte=price_max)

    serializer = ServiceSerializer(services, many=True)
    return Response({"status": "success", "data": serializer.data})


@csrf_exempt
@api_view(["GET"])
def api_service_detail(request, service_id):
    """GET одна запись услуги"""
    try:
        service = Service.objects.get(id=service_id, status="active")
        serializer = ServiceSerializer(service)
        return Response({"status": "success", "data": serializer.data})
    except Service.DoesNotExist:
        return Response(
            {"status": "error", "message": "Товар не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["POST"])
def api_service_create(request):
    """POST добавление новой услуги с картинкой и видео"""
    try:
        name = request.data.get("name")
        price = request.data.get("price")
        description = request.data.get("description")
        category = request.data.get("category")
        brand = request.data.get("brand")
        rating = request.data.get("rating", 0)
        weight = request.data.get("weight", 0)

        if not all([name, price, description, category, brand]):
            return Response(
                {"status": "error", "message": "Не заполнены обязательные поля"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def simple_slugify(text):
            rus_to_lat = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
                'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
                'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
                'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
                'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
            }
            text = text.lower().strip()
            result = ''
            for char in text:
                if char in rus_to_lat:
                    result += rus_to_lat[char]
                elif char.isalnum():
                    result += char
                else:
                    result += '-'
            result = re.sub(r'-+', '-', result)
            return result.strip('-')

        base_name = simple_slugify(name)
        image_key = None
        video_key = None

        if "image" in request.FILES:
            image_file = request.FILES["image"]
            ext = image_file.name.split(".")[-1].lower()
            image_key = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
            from .minio_client import upload_file_to_minio
            success = upload_file_to_minio(image_file, image_key)
            if not success:
                return Response(
                    {"status": "error", "message": "Ошибка загрузки изображения"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if "video" in request.FILES:
            video_file = request.FILES["video"]
            ext = video_file.name.split(".")[-1].lower()
            video_key = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
            from .minio_client import upload_file_to_minio
            success = upload_file_to_minio(video_file, video_key)
            if not success:
                return Response(
                    {"status": "error", "message": "Ошибка загрузки видео"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        service = Service.objects.create(
            name=name,
            price=price,
            description=description,
            image_key=image_key,
            video_key=video_key,
            category=category,
            brand=brand,
            rating=rating,
            weight=weight,
            status="active",
        )

        serializer = ServiceSerializer(service)
        return Response(
            {
                "status": "success",
                "message": "Услуга успешно создана",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Error creating service: {str(e)}")
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
def api_cart_icon(request):
    """GET иконки корзины (id черновика + количество услуг)"""
    user = get_current_user()

    try:
        draft_order = Order.objects.get(user=user, status="draft")
        items_count = OrderItem.objects.filter(order=draft_order).count()
        return Response(
            {
                "status": "success",
                "data": {"order_id": draft_order.id, "items_count": items_count},
            }
        )
    except Order.DoesNotExist:
        return Response(
            {"status": "success", "data": {"order_id": None, "items_count": 0}}
        )


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def api_order_list(request):
    """GET список заявок (кроме удаленных и черновика) с фильтрацией"""
    orders = Order.objects.exclude(status__in=["draft", "deleted"])

    status_filter = request.query_params.get("status")
    if status_filter:
        orders = orders.filter(status=status_filter)

    date_from = request.query_params.get("date_from")
    if date_from:
        orders = orders.filter(submitted_at__date__gte=date_from)

    date_to = request.query_params.get("date_to")
    if date_to:
        orders = orders.filter(submitted_at__date__lte=date_to)

    orders = orders.annotate(items_count=Count("items"))
    serializer = OrderListSerializer(orders, many=True)
    return Response({"status": "success", "data": serializer.data})


@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def api_order_detail(request, order_id):
    """GET одна заявка (поля заявки + её услуги с картинками)"""
    try:
        order = Order.objects.get(id=order_id)
        if order.status == "deleted":
            return Response(
                {"status": "error", "message": "Заявка удалена"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        # Проверка: пользователь может видеть только свои заявки, если он не ADMIN
        user = request.user
        if user.role != 'ADMIN' and order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нет доступа к этой заявке"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        items = order.items.select_related("service")
        for item in items:
            if item.service.image_key:
                item.service.image_url = f"http://localhost:9000/services/{item.service.image_key}"
        serializer = OrderSerializer(order)
        return Response({"status": "success", "data": serializer.data})
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def api_order_update(request, order_id):
    """PUT изменения полей заявки по теме"""
    try:
        order = Order.objects.get(id=order_id)
        user = request.user

        if order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нельзя редактировать чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != "draft":
            return Response(
                {"status": "error", "message": "Редактировать можно только черновик"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delivery_address = request.data.get("delivery_address")
        if delivery_address:
            order.delivery_address = delivery_address

        order.save()
        serializer = OrderSerializer(order)
        return Response(
            {"status": "success", "message": "Заявка обновлена", "data": serializer.data}
        )
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def api_order_submit(request, order_id):
    """PUT сформировать заявку (дата формирования + расчёт)"""
    try:
        order = Order.objects.get(id=order_id)
        user = request.user

        if order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нельзя сформировать чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != "draft":
            return Response(
                {"status": "error", "message": "Сформировать можно только черновик"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not order.delivery_address:
            return Response(
                {"status": "error", "message": "Не указан адрес доставки"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = OrderItem.objects.filter(order=order)
        if not items.exists():
            return Response(
                {"status": "error", "message": "Нельзя сформировать пустую заявку"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = sum(item.quantity * item.price_at_time for item in items)
        order.total_amount = total
        order.delivery_date = timezone.now().date() + timedelta(days=7)
        order.delivery_cost = max(total * 0.05, 300)
        order.status = "submitted"
        order.submitted_at = timezone.now()
        order.save()

        serializer = OrderSerializer(order)
        return Response(
            {"status": "success", "message": "Заявка сформирована", "data": serializer.data}
        )
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def api_order_complete(request, order_id):
    """PUT завершить заявку модератором"""
    try:
        order = Order.objects.get(id=order_id)
        moderator = get_moderator_user()
        user = request.user

        # Только модератор (ADMIN) может завершить заявку
        if user.role != 'ADMIN':
            return Response(
                {"status": "error", "message": "Только модератор может завершить заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != "submitted":
            return Response(
                {"status": "error", "message": "Завершить можно только сформированную заявку"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = "completed"
        order.completed_at = timezone.now()
        order.moderator = moderator

        items = OrderItem.objects.filter(order=order).select_related("service")
        order.total_items = sum(item.quantity for item in items)
        order.total_weight = sum(float(item.service.weight) * item.quantity for item in items)

        order.save()
        serializer = OrderSerializer(order)
        return Response(
            {"status": "success", "message": "Заявка завершена", "data": serializer.data}
        )
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def api_order_reject(request, order_id):
    """PUT отклонить заявку модератором"""
    try:
        order = Order.objects.get(id=order_id)
        moderator = get_moderator_user()
        user = request.user

        # Только модератор (ADMIN) может отклонить заявку
        if user.role != 'ADMIN':
            return Response(
                {"status": "error", "message": "Только модератор может отклонить заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != "submitted":
            return Response(
                {"status": "error", "message": "Отклонить можно только сформированную заявку"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = "rejected"
        order.completed_at = timezone.now()
        order.moderator = moderator
        order.save()

        serializer = OrderSerializer(order)
        return Response(
            {"status": "success", "message": "Заявка отклонена", "data": serializer.data}
        )
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def api_order_delete(request, order_id):
    """DELETE логическое удаление заявки"""
    try:
        order = Order.objects.get(id=order_id)
        user = request.user

        if order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нельзя удалить чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status not in ["draft", "submitted"]:
            return Response(
                {"status": "error", "message": "Нельзя удалить заявку в этом статусе"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = "deleted"
        order.save()
        return Response({"status": "success", "message": "Заявка удалена"})
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def api_order_item_add(request):
    """POST добавление услуги в заявку-черновик"""
    try:
        service_id = request.data.get("service_id")
        quantity = request.data.get("quantity", 1)

        if not service_id:
            return Response(
                {"status": "error", "message": "Не указан ID услуги"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_object_or_404(Service, id=service_id, status="active")
        user = request.user

        order, created = Order.objects.get_or_create(
            user=user,
            status="draft",
            defaults={"created_at": timezone.now(), "total_amount": 0},
        )

        order_item, item_created = OrderItem.objects.get_or_create(
            order=order,
            service=service,
            defaults={"quantity": quantity, "price_at_time": service.price},
        )

        if not item_created:
            order_item.quantity += quantity
            order_item.save()

        return Response(
            {
                "status": "success",
                "message": "Услуга добавлена в заявку",
                "data": {
                    "order_id": order.id,
                    "order_item_id": order_item.id,
                    "quantity": order_item.quantity,
                },
            },
            status=status.HTTP_201_CREATED,
        )
    except Service.DoesNotExist:
        return Response(
            {"status": "error", "message": "Услуга не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def api_order_item_update(request, order_id, service_id):
    """PUT изменение количества в м-м (без PK)"""
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        user = request.user

        if order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нельзя редактировать чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status != "draft":
            return Response(
                {"status": "error", "message": "Редактировать можно только черновик"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quantity = request.data.get("quantity")
        if quantity is None:
            return Response(
                {"status": "error", "message": "Не указано количество"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_item = get_object_or_404(OrderItem, order=order, service=service)
        order_item.quantity = quantity
        order_item.save()

        return Response(
            {
                "status": "success",
                "message": "Количество обновлено",
                "data": {
                    "order_id": order.id,
                    "service_id": service.id,
                    "quantity": order_item.quantity,
                },
            }
        )
    except OrderItem.DoesNotExist:
        return Response(
            {"status": "error", "message": "Услуга не найдена в заявке"},
            status=status.HTTP_404_NOT_FOUND,
        )


@csrf_exempt
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def api_order_item_delete(request, order_id, service_id):
    """DELETE удаление из заявки (без PK)"""
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        user = request.user

        if order.user.id != user.id:
            return Response(
                {"status": "error", "message": "Нельзя удалить из чужой заявки"},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_item = get_object_or_404(OrderItem, order=order, service=service)
        order_item.delete()
        return Response({"status": "success", "message": "Услуга удалена из заявки"})
    except OrderItem.DoesNotExist:
        return Response(
            {"status": "error", "message": "Услуга не найдена в заявке"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "password": {"type": "string"},
                "email": {"type": "string"},
            },
            "required": ["username", "password", "email"],
        }
    },
    responses={201: UserSerializer, 400: {"description": "Ошибка валидации"}},
    examples=[
        OpenApiExample(
            "Пример запроса",
            value={
                "username": "newuser",
                "password": "password123",
                "email": "newuser@example.com"
            },
            request_only=True,
        )
    ],
)
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def api_register(request):
    """POST регистрация нового пользователя"""
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        logger.info(f"New user registered: {user.username}, role: {user.role}")
        return Response(
            {
                "status": "success",
                "message": "Пользователь зарегистрирован",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
    logger.warning(f"Registration failed: {serializer.errors}")
    return Response(
        {"status": "error", "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def api_login(request):
    """POST аутентификация"""
    from django.contrib.auth import authenticate, login as auth_login
    
    username = request.data.get("username")
    password = request.data.get("password")
    
    user = authenticate(username=username, password=password)
    
    if user:
        auth_login(request, user)
        return Response({
            "status": "success",
            "message": "Аутентификация успешна",
            "data": {
                "username": user.username,
                "role": user.role,
            }
        })
    else:
        return Response(
            {"status": "error", "message": "Неверные учетные данные"},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def api_logout(request):
    """POST деавторизация"""
    from django.contrib.auth import logout as auth_logout
    
    auth_logout(request)
    return Response({"status": "success", "message": "Деавторизация выполнена"})
