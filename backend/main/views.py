import logging
import re
import traceback
import uuid
from datetime import timedelta

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.core.cache import cache
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiTypes,
    extend_schema,
)
from prometheus_client import Counter, REGISTRY
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .minio_client import get_image_url, get_public_file_url, get_video_url
from .models import Order, OrderItem, Service, User
from .permissions import IsAdminOnly, IsUserOrAdmin
from .serializers import (
    OrderItemSerializer,
    OrderListSerializer,
    OrderSerializer,
    ServiceSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)
cache_logger = logging.getLogger("cache")
auth_logger = logging.getLogger("auth")


def _get_or_register_counter(name: str, description: str, labelnames: list) -> Counter:
    try:
        return Counter(name, description, labelnames)
    except ValueError:
        return REGISTRY._names_to_collectors.get(name)


AUTH_LOGIN_TOTAL = _get_or_register_counter(
    "auth_login_total",
    "Total login attempts",
    ["status", "role"],
)


def get_cached_or_fetch(key: str, fetch_func, ttl: int = 300):
    try:
        data = cache.get(key)
        if data is not None:
            cache_logger.info(f"CACHE HIT | key={key} | ttl={ttl}s")
            return data, True

        cache_logger.info(f"CACHE MISS | key={key} | fetching from DB...")
        data = fetch_func()

        if data is not None:
            cache.set(key, data, ttl)
            cache_logger.info(f"CACHE SET | key={key} | ttl={ttl}s")

        return data, False
    except Exception as e:
        cache_logger.error(f"CACHE ERROR | key={key} | error={str(e)}")
        return fetch_func(), False


def invalidate_service_cache(service_id: int = None):
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("services_list:*")
        else:
            cache.delete("services_list:")
        cache_logger.info("CACHE INVALIDATE | key=services_list:* | reason=batch_invalidation")
    except Exception as e:
        cache_logger.error(f"CACHE INVALIDATE ERROR | key=services_list:* | error={str(e)}")

    if service_id:
        try:
            cache_key = f"service_detail:{service_id}"
            cache.delete(cache_key)
            cache_logger.info(f"CACHE INVALIDATE | key={cache_key} | reason=service_updated")
        except Exception as e:
            cache_logger.error(f"CACHE INVALIDATE ERROR | key=service_detail:{service_id} | error={str(e)}")


def _simple_slugify(text: str) -> str:
    rus_to_lat = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    }
    text = text.lower().strip()
    result = "".join(rus_to_lat.get(c, c if c.isalnum() else "-") for c in text)
    return re.sub(r"-+", "-", result).strip("-")


def _get_service_image_url(image_key: str) -> str:
    return get_image_url(image_key)


def _get_service_video_url(video_key: str) -> str | None:
    return get_video_url(video_key)


def _get_cart_info(user) -> tuple[Order | None, int]:
    if not user or not user.is_authenticated:
        return None, 0
    try:
        current_order = Order.objects.get(user=user, status="draft")
        cart_items_count = OrderItem.objects.filter(order=current_order).count()
        return current_order, cart_items_count
    except Order.DoesNotExist:
        return None, 0


def index(request):
    services = Service.objects.filter(status="active")[:4]
    for service in services:
        service.image_url = _get_service_image_url(service.image_key)

    current_order, cart_items_count = _get_cart_info(request.user)
    background_video_url = get_public_file_url("background.mp4")

    return render(
        request,
        "main/index.html",
        {
            "isError": False,
            "error": None,
            "services": services,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
            "background_video_url": background_video_url,
        },
    )


def service_list(request):
    search_query = request.GET.get("search", "")
    services = Service.objects.filter(status="active")

    if search_query:
        services = services.filter(
            Q(name__icontains=search_query) | Q(category__icontains=search_query)
        )

    for service in services:
        service.image_url = _get_service_image_url(service.image_key)

    current_order, cart_items_count = _get_cart_info(request.user)

    return render(
        request,
        "main/service_list.html",
        {
            "isError": False,
            "error": None,
            "services": services,
            "search_query": search_query,
            "cart_items_count": cart_items_count,
            "current_order": current_order,
        },
    )


def service_detail(request, service_id: int):
    service = get_object_or_404(Service, id=service_id, status="active")
    service.image_url = _get_service_image_url(service.image_key)
    service.video_url = _get_service_video_url(service.video_key)

    current_order, cart_items_count = _get_cart_info(request.user)

    return render(
        request,
        "main/service_detail.html",
        {
            "isError": False,
            "error": None,
            "service": service,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    )


def order_detail(request, order_id: int):
    order = get_object_or_404(Order, id=order_id)

    if order.status == "deleted":
        return render(request, "main/order_deleted.html", {"order_id": order_id})

    order_items = OrderItem.objects.filter(order=order).select_related("service")
    for item in order_items:
        item.service.image_url = _get_service_image_url(item.service.image_key)

    current_order, cart_items_count = _get_cart_info(request.user)

    return render(
        request,
        "main/order_detail.html",
        {
            "isError": False,
            "error": None,
            "order": order,
            "order_items": order_items,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    )


def order_list(request):
    user = request.user if request.user.is_authenticated else None

    if user and user.is_authenticated:
        orders = Order.objects.filter(user=user).order_by("-created_at")
        current_order, cart_items_count = _get_cart_info(user)
    else:
        orders = Order.objects.none()
        current_order, cart_items_count = None, 0

    return render(
        request,
        "main/order_list.html",
        {
            "isError": False,
            "error": None,
            "orders": orders,
            "current_order": current_order,
            "cart_items_count": cart_items_count,
        },
    )


def add_to_order(request, service_id: int):
    if request.method != "POST":
        return HttpResponse(status=405)

    if not request.user.is_authenticated:
        auth_logger.warning(
            f"Add to order denied | user=anonymous | service_id={service_id} | result=401"
        )
        return redirect("/pages/login/")

    user = request.user
    order, _ = Order.objects.get_or_create(
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

    auth_logger.info(
        f"Item added to order | user={user.username} | service_id={service_id} | "
        f"order_id={order.id} | result=302"
    )
    return redirect(f"/pages/order/{order.id}/")


def delete_order(request, order_id: int):
    if request.method != "POST":
        return HttpResponse(status=405)

    if not request.user.is_authenticated:
        auth_logger.warning(
            f"Delete order denied | user=anonymous | order_id={order_id} | result=401"
        )
        return redirect("/pages/login/")

    order = get_object_or_404(Order, id=order_id)
    if order.user != request.user:
        auth_logger.warning(
            f"Delete order denied | user={request.user.username} | order_id={order_id} | "
            f"reason=not_owner | result=403"
        )
        return HttpResponse("Доступ запрещён", status=403)

    order.status = "deleted"
    order.save()

    auth_logger.info(
        f"Order deleted | user={request.user.username} | order_id={order_id} | result=302"
    )
    return redirect("/pages/orders/")


def complete_order(request, order_id: int):
    if request.method != "POST":
        return HttpResponse(status=405)

    if not request.user.is_authenticated:
        auth_logger.warning(
            f"Complete order denied | user=anonymous | order_id={order_id} | result=401"
        )
        return redirect("/pages/login/")

    order = get_object_or_404(Order, id=order_id)
    if order.user != request.user:
        auth_logger.warning(
            f"Complete order denied | user={request.user.username} | order_id={order_id} | "
            f"reason=not_owner | result=403"
        )
        return HttpResponse("Доступ запрещён", status=403)

    order_items = OrderItem.objects.filter(order=order).select_related("service")
    total_items = sum(item.quantity for item in order_items)
    total_weight = sum(
        float(item.service.weight) * item.quantity
        for item in order_items
        if item.service.weight
    )

    order.status = "completed"
    order.completed_at = timezone.now()
    order.total_items = total_items
    order.total_weight = round(total_weight, 2)
    order.save()

    auth_logger.info(
        f"Order completed | user={request.user.username} | order_id={order_id} | "
        f"total_items={total_items} | result=302"
    )
    return redirect(f"/pages/order/{order_id}/")


@extend_schema(
    tags=["Services"],
    summary="Список услуг",
    parameters=[
        OpenApiParameter(name="name", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, description="Поиск по названию"),
        OpenApiParameter(name="search", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, description="Поиск по названию"),
        OpenApiParameter(name="category", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, description="Фильтр по категории"),
        OpenApiParameter(name="price_min", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Минимальная цена"),
        OpenApiParameter(name="price_max", type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, description="Максимальная цена"),
        OpenApiParameter(name="date_from", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Дата создания с"),
        OpenApiParameter(name="date_to", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Дата создания по"),
    ],
    responses={
        200: {
            "description": "Список услуг",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "data": [
                            {"id": 1, "name": "iPhone 16 Pro", "price": 120000, "category": "Смартфоны"}
                        ]
                    }
                }
            }
        }
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def api_service_list(request):
    include_all = (
        request.query_params.get("include_all") == "1"
        and request.user.is_authenticated
        and request.user.role == "ADMIN"
    )

    def fetch_services():
        services = Service.objects.all() if include_all else Service.objects.filter(status="active")
        
        if name_filter := request.query_params.get("name") or request.query_params.get("search"):
            services = services.filter(name__icontains=name_filter)
        if category_filter := request.query_params.get("category"):
            if category_filter == "all":
                category_filter = None
        if category_filter:
            services = services.filter(category__icontains=category_filter)
        if price_min := request.query_params.get("price_min") or request.query_params.get("price_from"):
            services = services.filter(price__gte=price_min)
        if price_max := request.query_params.get("price_max") or request.query_params.get("price_to"):
            services = services.filter(price__lte=price_max)
        if date_from := request.query_params.get("date_from"):
            services = services.filter(created_at__date__gte=date_from)
        if date_to := request.query_params.get("date_to"):
            services = services.filter(created_at__date__lte=date_to)
            
        return ServiceSerializer(services, many=True).data

    if include_all:
        return Response({"status": "success", "data": fetch_services()})

    query_string = request.META.get("QUERY_STRING", "")
    cache_key = f"services_list:{query_string}"
    data, is_hit = get_cached_or_fetch(cache_key, fetch_services, ttl=300)

    response = Response({"status": "success", "data": data})
    response.headers["X-Cache"] = "HIT" if is_hit else "MISS"
    return response


@api_view(["PATCH"])
@permission_classes([IsAdminOnly])
def api_service_status(request, service_id: int):
    service = get_object_or_404(Service, id=service_id)
    next_status = request.data.get("status")
    if next_status not in {"active", "inactive", "deleted"}:
        return Response(
            {"status": "error", "message": "Недопустимый статус товара"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    service.status = next_status
    service.save(update_fields=["status"])
    invalidate_service_cache(service_id=service.id)
    return Response({"status": "success", "data": ServiceSerializer(service).data})


@api_view(["DELETE"])
@permission_classes([IsAdminOnly])
def api_service_delete(request, service_id: int):
    service = get_object_or_404(Service, id=service_id)
    service.status = "deleted"
    service.save(update_fields=["status"])
    invalidate_service_cache(service_id=service.id)
    return Response({"status": "success", "message": "Товар удален"})


@extend_schema(
    tags=["Services"],
    summary="Детали услуги",
    parameters=[
        OpenApiParameter(name="service_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, description="ID услуги", required=True),
    ],
    responses={
        200: {
            "description": "Детали услуги",
            "content": {
                "application/json": {
                    "example": {
                        "status": "success",
                        "data": {"id": 1, "name": "iPhone 16 Pro", "price": 120000, "category": "Смартфоны"}
                    }
                }
            }
        },
        404: {"description": "Услуга не найдена"},
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def api_service_detail(request, service_id: int):
    def fetch_service():
        service = Service.objects.get(id=service_id, status="active")
        return ServiceSerializer(service).data

    cache_key = f"service_detail:{service_id}"
    try:
        data, is_hit = get_cached_or_fetch(cache_key, fetch_service, ttl=600)
        response = Response({"status": "success", "data": data})
        response.headers["X-Cache"] = "HIT" if is_hit else "MISS"
        return response
    except Service.DoesNotExist:
        return Response({"status": "error", "message": "Товар не найден"}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    tags=["Services"],
    summary="Создание услуги",
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "example": "Новая услуга"},
                "price": {"type": "number", "example": 10000},
                "description": {"type": "string", "example": "Описание"},
                "category": {"type": "string", "example": "Электроника"},
                "brand": {"type": "string", "example": "Brand"},
                "image": {"type": "string", "format": "binary"},
            },
            "required": ["name", "price", "description", "category", "brand"],
        }
    },
    responses={201: {"description": "Услуга создана"}, 400: {"description": "Ошибка валидации"}},
)
@api_view(["POST"])
@permission_classes([IsAdminOnly])
def api_service_create(request):
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

        base_name = _simple_slugify(name)
        image_key = video_key = None

        if "image" in request.FILES:
            image_file = request.FILES["image"]
            ext = image_file.name.split(".")[-1].lower()
            image_key = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
            from .minio_client import upload_file_to_minio
            if not upload_file_to_minio(image_file, image_key):
                return Response(
                    {"status": "error", "message": "Ошибка загрузки изображения"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if "video" in request.FILES:
            video_file = request.FILES["video"]
            ext = video_file.name.split(".")[-1].lower()
            video_key = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
            from .minio_client import upload_file_to_minio
            if not upload_file_to_minio(video_file, video_key):
                return Response(
                    {"status": "error", "message": "Ошибка загрузки видео"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        service = Service.objects.create(
            name=name,
            price=price,
            description=description,
            category=category,
            brand=brand,
            rating=rating,
            weight=weight,
            status="active",
            image_key=image_key,
            video_key=video_key,
        )
        invalidate_service_cache(service_id=service.id)
        
        auth_logger.info(
            f"Service created | user={request.user.username} | service_id={service.id} | result=201"
        )
        
        return Response(
            {
                "status": "success",
                "message": "Услуга создана",
                "data": ServiceSerializer(service).data,
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        logger.error(f"Error creating service: {str(e)}")
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["Orders"],
    summary="Иконка корзины",
    responses={200: {"description": "Информация о корзине"}},
)
@api_view(["GET"])
@permission_classes([IsUserOrAdmin])
def api_cart_icon(request):
    if not request.user.is_authenticated:
        return Response({"status": "success", "data": {"order_id": None, "items_count": 0, "items": []}})
    
    try:
        draft_order = Order.objects.prefetch_related("items__service").get(
            user=request.user,
            status="draft",
        )
        items = OrderItem.objects.filter(order=draft_order).select_related("service")
        return Response({
            "status": "success",
            "data": {
                "order_id": draft_order.id,
                "items_count": items.count(),
                "items": [
                    {
                        "serviceId": item.service_id,
                        "name": item.service.name,
                        "price": item.price_at_time,
                        "quantity": item.quantity,
                        "image_url": _get_service_image_url(item.service.image_key),
                    }
                    for item in items
                ],
            },
        })
    except Order.DoesNotExist:
        return Response({"status": "success", "data": {"order_id": None, "items_count": 0, "items": []}})


@extend_schema(
    tags=["Orders"],
    summary="Список заявок",
    parameters=[
        OpenApiParameter(name="status", type=OpenApiTypes.STR, location=OpenApiParameter.QUERY),
        OpenApiParameter(name="date_from", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY),
        OpenApiParameter(name="date_to", type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY),
    ],
    responses={200: {"description": "Список заявок"}},
)
@api_view(["GET"])
@permission_classes([IsUserOrAdmin])
def api_order_list(request):
    user = request.user
    
    if user.role == "ADMIN":
        orders = Order.objects.exclude(status__in=["draft", "deleted"])
    else:
        orders = Order.objects.filter(user=user).exclude(status__in=["draft", "deleted"])
    
    if status_filter := request.query_params.get("status"):
        orders = orders.filter(status=status_filter)
    if date_from := request.query_params.get("date_from"):
        orders = orders.filter(submitted_at__date__gte=date_from)
    if date_to := request.query_params.get("date_to"):
        orders = orders.filter(submitted_at__date__lte=date_to)

    return Response({
        "status": "success",
        "data": OrderListSerializer(orders.annotate(items_count=Count("items")), many=True).data
    })


@extend_schema(
    tags=["Orders"],
    summary="Детали заявки",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    responses={
        200: {"description": "Детали заявки"},
        403: {"description": "Нет доступа"},
        404: {"description": "Не найдено"},
    },
)
@api_view(["GET"])
@permission_classes([IsUserOrAdmin])
def api_order_detail(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
        
        if order.status == "deleted":
            return Response(
                {"status": "error", "message": "Заявка удалена"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user.role != "ADMIN" and order.user != request.user:
            return Response(
                {"status": "error", "message": "Нет доступа"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        order_data = OrderSerializer(
            Order.objects.prefetch_related("items__service").get(id=order_id)
        ).data
        return Response({"status": "success", "data": order_data})
        
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["Orders"],
    summary="Обновить заявку",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    request={
        "application/json": {
            "type": "object",
            "properties": {"delivery_address": {"type": "string"}},
        }
    },
    responses={
        200: {"description": "Обновлено"},
        400: {"description": "Ошибка"},
        403: {"description": "Нет доступа"},
    },
)
@api_view(["PUT"])
@permission_classes([IsUserOrAdmin])
def api_order_update(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
        
        if order.user != request.user:
            auth_logger.warning(
                f"Order update denied | user={request.user.username} | order_id={order_id} | "
                f"reason=not_owner | result=403"
            )
            return Response(
                {"status": "error", "message": "Нельзя редактировать чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if order.status != "draft":
            return Response(
                {"status": "error", "message": "Редактировать можно только черновик"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if delivery_address := request.data.get("delivery_address"):
            order.delivery_address = delivery_address
        order.save()
        
        return Response({
            "status": "success",
            "message": "Заявка обновлена",
            "data": OrderSerializer(order).data,
        })
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["Orders"],
    summary="Сформировать заявку",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    responses={
        200: {"description": "Сформирована"},
        400: {"description": "Ошибка"},
        403: {"description": "Нет доступа"},
    },
)
@api_view(["PUT"])
@permission_classes([IsUserOrAdmin])
def api_order_submit(request, order_id: int):
    try:
        order = Order.objects.select_related("user").get(id=order_id)
        user = request.user
        
        if order.user != user and user.role != "ADMIN":
            logger.warning(
                f"Submit denied: user {user.username} tried to submit order {order_id} "
                f"of user {order.user.username}"
            )
            return Response(
                {"status": "error", "message": "Нельзя сформировать чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if order.status != "draft":
            return Response(
                {
                    "status": "error",
                    "message": f"Сформировать можно только черновик (текущий статус: {order.status})",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        items = OrderItem.objects.filter(order=order).select_related("service")
        if not items.exists():
            return Response(
                {"status": "error", "message": "Нельзя сформировать пустую заявку"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if not order.delivery_address or not order.delivery_address.strip():
            order.delivery_address = "г. Москва, ул. Примерная, д. 1"
        
        total = sum(
            (int(it.quantity) if it.quantity else 1) * (float(it.price_at_time) if it.price_at_time else 0)
            for it in items
        )
        total_weight = sum(
            float(it.service.weight) * (int(it.quantity) if it.quantity else 1)
            for it in items
            if it.service and it.service.weight
        )
        
        order.total_amount = total
        order.delivery_date = timezone.now().date() + timedelta(days=7)
        order.delivery_cost = max(total * 0.05, 300) if total > 0 else 300
        order.status = "submitted"
        order.submitted_at = timezone.now()
        order.total_weight = round(total_weight, 2)
        order.save()
        
        logger.info(f"Order {order_id} submitted successfully by user {user.username}")
        return Response({
            "status": "success",
            "message": "Заявка сформирована",
            "data": OrderSerializer(order).data,
        })
        
    except Order.DoesNotExist:
        logger.error(f"Order {order_id} not found")
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.error(f"Submit order {order_id} failed: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response(
            {"status": "error", "message": f"Ошибка сервера: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["Orders"],
    summary="Завершить заявку (модератор)",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    responses={
        200: {"description": "Завершена"},
        400: {"description": "Ошибка"},
        403: {"description": "Только модератор"},
    },
)
@api_view(["PUT"])
@permission_classes([IsAdminOnly])
def api_order_complete(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
        
        if request.user.role != "ADMIN":
            auth_logger.warning(
                f"Order complete denied | user={request.user.username} | "
                f"role={request.user.role} | order_id={order_id} | reason=not_admin | result=403"
            )
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
        order.moderator = request.user
        
        items = OrderItem.objects.filter(order=order).select_related("service")
        order.total_items = sum(item.quantity for item in items)
        order.total_weight = sum(
            float(item.service.weight) * item.quantity for item in items
        )
        order.save()
        
        auth_logger.info(
            f"Order completed by admin | admin={request.user.username} | "
            f"order_id={order_id} | result=200"
        )
        return Response({
            "status": "success",
            "message": "Заявка завершена",
            "data": OrderSerializer(order).data,
        })
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["Orders"],
    summary="Отклонить заявку (модератор)",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    responses={
        200: {"description": "Отклонена"},
        400: {"description": "Ошибка"},
        403: {"description": "Только модератор"},
    },
)
@api_view(["PUT"])
@permission_classes([IsAdminOnly])
def api_order_reject(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
        
        if request.user.role != "ADMIN":
            auth_logger.warning(
                f"Order reject denied | user={request.user.username} | "
                f"role={request.user.role} | order_id={order_id} | reason=not_admin | result=403"
            )
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
        order.moderator = request.user
        order.save()
        
        auth_logger.info(
            f"Order rejected by admin | admin={request.user.username} | "
            f"order_id={order_id} | result=200"
        )
        return Response({
            "status": "success",
            "message": "Заявка отклонена",
            "data": OrderSerializer(order).data,
        })
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["Orders"],
    summary="Удалить заявку",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True)
    ],
    responses={
        200: {"description": "Удалена"},
        400: {"description": "Ошибка"},
        403: {"description": "Нет доступа"},
    },
)
@api_view(["DELETE"])
@permission_classes([IsUserOrAdmin])
def api_order_delete(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
        
        is_admin = request.user.role == "ADMIN"
        if order.user != request.user and not is_admin:
            auth_logger.warning(
                f"Order delete denied | user={request.user.username} | order_id={order_id} | "
                f"reason=not_owner | result=403"
            )
            return Response(
                {"status": "error", "message": "Нельзя удалить чужую заявку"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not is_admin and order.status not in ["draft", "submitted"]:
            return Response(
                {"status": "error", "message": "Нельзя удалить заявку в этом статусе"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        order.status = "deleted"
        order.save()
        
        auth_logger.info(
            f"Order deleted | user={request.user.username} | order_id={order_id} | result=200"
        )
        return Response({"status": "success", "message": "Заявка удалена"})
    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["OrderItems"],
    summary="Добавить товар в заявку",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "service_id": {"type": "integer"},
                "quantity": {"type": "integer", "default": 1},
            },
            "required": ["service_id"],
        }
    },
    responses={201: {"description": "Добавлен"}, 400: {"description": "Ошибка"}},
)
@api_view(["POST"])
@permission_classes([IsUserOrAdmin])
def api_order_item_add(request):
    try:
        service_id = request.data.get("service_id")
        quantity = int(request.data.get("quantity", 1))
        
        if not service_id:
            return Response(
                {"status": "error", "message": "Не указан ID услуги"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        service = get_object_or_404(Service, id=service_id, status="active")
        user = request.user
        
        order, _ = Order.objects.get_or_create(
            user=user,
            status="draft",
            defaults={"created_at": timezone.now(), "total_amount": 0},
        )
        order_item, created = OrderItem.objects.get_or_create(
            order=order,
            service=service,
            defaults={"quantity": quantity, "price_at_time": service.price},
        )
        
        if not created:
            order_item.quantity += quantity
            order_item.save()
        
        order.total_amount = sum(
            (it.quantity or 1) * (it.price_at_time or 0)
            for it in OrderItem.objects.filter(order=order)
        )
        order.save()
        
        return Response(
            {
                "status": "success",
                "data": {
                    "order_id": order.id,
                    "service_name": service.name,
                    "service_price": service.price,
                    "quantity": order_item.quantity,
                },
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["OrderItems"],
    summary="Обновить товар в заявке",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True),
        OpenApiParameter(name="service_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True),
    ],
    request={
        "application/json": {
            "type": "object",
            "properties": {"quantity": {"type": "integer"}},
            "required": ["quantity"],
        }
    },
    responses={
        200: {"description": "Обновлено"},
        400: {"description": "Ошибка"},
        403: {"description": "Нет доступа"},
    },
)
@api_view(["PUT"])
@permission_classes([IsUserOrAdmin])
def api_order_item_update(request, order_id: int, service_id: int):
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        
        if order.user != request.user:
            auth_logger.warning(
                f"Order item update denied | user={request.user.username} | "
                f"order_id={order_id} | reason=not_owner | result=403"
            )
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
        order_item.quantity = max(1, int(quantity))
        order_item.save()
        order.total_amount = sum(
            item.quantity * item.price_at_time
            for item in OrderItem.objects.filter(order=order)
        )
        order.save(update_fields=["total_amount"])
        
        return Response({
            "status": "success",
            "message": "Количество обновлено",
            "data": {
                "order_id": order.id,
                "service_id": service.id,
                "quantity": order_item.quantity,
            },
        })
    except OrderItem.DoesNotExist:
        return Response(
            {"status": "error", "message": "Услуга не найдена в заявке"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["OrderItems"],
    summary="Удалить товар из заявки",
    parameters=[
        OpenApiParameter(name="order_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True),
        OpenApiParameter(name="service_id", type=OpenApiTypes.INT, location=OpenApiParameter.PATH, required=True),
    ],
    responses={
        200: {"description": "Удалён"},
        403: {"description": "Нет доступа"},
        404: {"description": "Не найден"},
    },
)
@api_view(["DELETE"])
@permission_classes([IsUserOrAdmin])
def api_order_item_delete(request, order_id: int, service_id: int):
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        
        if order.user != request.user:
            auth_logger.warning(
                f"Order item delete denied | user={request.user.username} | "
                f"order_id={order_id} | reason=not_owner | result=403"
            )
            return Response(
                {"status": "error", "message": "Нельзя удалить из чужой заявки"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        order_item = get_object_or_404(OrderItem, order=order, service=service)
        order_item.delete()
        order.total_amount = sum(
            item.quantity * item.price_at_time
            for item in OrderItem.objects.filter(order=order)
        )
        order.save(update_fields=["total_amount"])
        
        auth_logger.info(
            f"Order item deleted | user={request.user.username} | order_id={order_id} | "
            f"service_id={service_id} | result=200"
        )
        return Response({"status": "success", "message": "Услуга удалена из заявки"})
    except OrderItem.DoesNotExist:
        return Response(
            {"status": "error", "message": "Услуга не найдена в заявке"},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    tags=["Auth"],
    summary="Регистрация пользователя",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "password": {"type": "string", "format": "password"},
                "email": {"type": "string", "format": "email"},
            },
            "required": ["username", "password", "email"],
        }
    },
    responses={201: {"description": "Зарегистрирован"}, 400: {"description": "Ошибка"}},
    examples=[
        OpenApiExample(
            "Пример",
            value={"username": "newuser", "password": "password123", "email": "newuser@example.com"},
            request_only=True,
        )
    ],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def api_register(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        auth_logger.info(
            f"User registered | username={user.username} | role={user.role} | result=201"
        )
        return Response(
            {
                "status": "success",
                "message": "Пользователь зарегистрирован",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
    
    auth_logger.warning(
        f"Registration failed | username={request.data.get('username')} | "
        f"errors={serializer.errors} | result=400"
    )
    return Response(
        {"status": "error", "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@extend_schema(
    tags=["Auth"],
    summary="Аутентификация пользователя",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "username": {"type": "string"},
                "password": {"type": "string", "format": "password"},
            },
            "required": ["username", "password"],
        }
    },
    responses={200: {"description": "Успех"}, 401: {"description": "Ошибка"}},
)
@api_view(["POST"])
@permission_classes([AllowAny])
def api_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(username=username, password=password)

    if user:
        try:
            auth_login(request, user)
        except Exception as e:
            logger.error(f"Session login failed: {str(e)}")
            AUTH_LOGIN_TOTAL.labels(status="success_no_session", role=user.role).inc()
            return Response({
                "status": "success",
                "message": "Аутентификация успешна (сессия не сохранена)",
                "data": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                },
                "warning": "Session storage unavailable",
            })
        
        AUTH_LOGIN_TOTAL.labels(status="success", role=user.role).inc()
        return Response({
            "status": "success",
            "message": "Аутентификация успешна",
            "data": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
        })
    else:
        AUTH_LOGIN_TOTAL.labels(status="failed", role="UNKNOWN").inc()
        auth_logger.warning(f"Login failed | username={username} | result=401")
        return Response(
            {"status": "error", "message": "Неверные учетные данные"},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@extend_schema(
    tags=["Auth"],
    summary="Выход из системы",
    responses={200: {"description": "Выход выполнен"}},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def api_logout(request):
    username = request.user.username if request.user.is_authenticated else "anonymous"
    auth_logout(request)
    auth_logger.info(f"Logout success | username={username} | result=200")
    return Response({"status": "success", "message": "Деавторизация выполнена"})


@extend_schema(
    tags=["Auth"],
    summary="Проверка статуса аутентификации",
    responses={
        200: {"description": "Пользователь аутентифицирован"},
        401: {"description": "Не аутентифицирован"},
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def api_auth_me(request):
    return Response({
        "status": "success",
        "data": {
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "role": request.user.role,
        },
    })


@extend_schema(
    tags=["Auth"],
    summary="Список пользователей (модератор)",
    responses={200: {"description": "Список пользователей"}},
)
@api_view(["GET"])
@permission_classes([IsAdminOnly])
def api_user_list(request):
    users = User.objects.order_by("id")
    return Response({
        "status": "success",
        "data": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            }
            for user in users
        ],
    })


@extend_schema(
    tags=["Auth"],
    summary="Изменить роль пользователя (модератор)",
    request={
        "application/json": {
            "type": "object",
            "properties": {"role": {"type": "string", "enum": ["USER", "ADMIN"]}},
            "required": ["role"],
        }
    },
    responses={200: {"description": "Роль обновлена"}, 400: {"description": "Ошибка"}},
)
@api_view(["PATCH"])
@permission_classes([IsAdminOnly])
def api_user_detail(request, user_id: int):
    user = get_object_or_404(User, id=user_id)
    role = request.data.get("role")
    if role not in {"USER", "ADMIN"}:
        return Response(
            {"status": "error", "message": "Недопустимая роль"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.role = role
    user.save(update_fields=["role"])
    return Response({
        "status": "success",
        "data": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        },
    })


@csrf_exempt
def login_page(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(username=username, password=password)
        
        if user:
            auth_login(request, user)
            auth_logger.info(
                f"Login success (HTML) | username={username} | role={user.role} | result=302"
            )
            return redirect("/pages/")
        
        auth_logger.warning(f"Login failed (HTML) | username={username} | result=200+error")
        return render(request, "main/login.html", {"error": "Неверные данные"})
    
    return render(request, "main/login.html")


@csrf_exempt
def register_page(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        email = request.POST.get("email")
        
        if User.objects.filter(username=username).exists():
            auth_logger.warning(
                f"Registration failed (HTML) | username={username} | "
                f"reason=exists | result=200+error"
            )
            return render(request, "main/register.html", {"error": "Пользователь уже существует"})
        
        user = User.objects.create_user(username=username, password=password, email=email)
        auth_login(request, user)
        auth_logger.info(
            f"User registered (HTML) | username={username} | role={user.role} | result=302"
        )
        return redirect("/pages/")
    
    return render(request, "main/register.html")


@csrf_exempt
def logout_page(request):
    username = request.user.username if request.user.is_authenticated else "anonymous"
    auth_logout(request)
    auth_logger.info(f"Logout success (HTML) | username={username} | result=302")
    return redirect("/pages/")


def api_schema(request):
    from drf_spectacular.views import SpectacularAPIView
    return SpectacularAPIView.as_view()(request)


def api_docs(request):
    from drf_spectacular.views import SpectacularSwaggerView
    return SpectacularSwaggerView.as_view(url_name="api_schema")(request)
