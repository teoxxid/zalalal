from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Order, OrderItem, Service, User
from .serializers import ServiceSerializer

# ========== HTML СТРАНИЦЫ ==========


def index(request):
    services = Service.objects.filter(status="active")[:4]
    for service in services:
        service.image_url = f"http://localhost:9000/services/{service.image_key}"

    try:
        user = User.objects.get(id=1)
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

    user, _ = User.objects.get_or_create(
        id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
    )

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

    user, _ = User.objects.get_or_create(
        id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
    )

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

    user, _ = User.objects.get_or_create(
        id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
    )

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
    user, _ = User.objects.get_or_create(
        id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
    )

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
        user, _ = User.objects.get_or_create(
            id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
        )

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


@api_view(["GET"])
def api_service_list(request):
    services = Service.objects.filter(status="active")
    serializer = ServiceSerializer(services, many=True)
    return Response({"status": "success", "data": serializer.data})


@api_view(["GET"])
def api_service_detail(request, service_id):
    try:
        service = Service.objects.get(id=service_id, status="active")
        serializer = ServiceSerializer(service)
        return Response({"status": "success", "data": serializer.data})
    except Service.DoesNotExist:
        return Response(
            {"status": "error", "message": "Товар не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["POST"])
def api_add_to_order(request, service_id):
    try:
        service = Service.objects.get(id=service_id, status="active")

        user, _ = User.objects.get_or_create(
            id=1, defaults={"username": "user1", "email": "user1@mail.ru"}
        )

        order, created = Order.objects.get_or_create(
            user=user,
            status="draft",
            defaults={"created_at": timezone.now(), "total_amount": 0},
        )

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

        return Response(
            {
                "status": "success",
                "message": "Товар добавлен в заявку",
                "data": {"order_id": order.id, "total_amount": order.total_amount},
            },
            status=status.HTTP_201_CREATED,
        )

    except Service.DoesNotExist:
        return Response(
            {"status": "error", "message": "Товар не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["PUT"])
def api_update_order_item(request, order_item_id):
    """Обновление количества товара в заявке"""
    try:
        order_item = OrderItem.objects.get(id=order_item_id)

        quantity = request.data.get("quantity")

        if quantity is None:
            return Response(
                {"status": "error", "message": "Не указано количество"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(quantity)
        except ValueError:
            return Response(
                {"status": "error", "message": "Количество должно быть числом"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            order_item.delete()
            message = "Товар удалён из заявки"
        else:
            order_item.quantity = quantity
            order_item.save()
            message = "Количество обновлено"

        order = order_item.order
        total = sum(
            item.quantity * item.price_at_time
            for item in OrderItem.objects.filter(order=order)
        )
        order.total_amount = total
        order.save()

        return Response(
            {
                "status": "success",
                "message": message,
                "data": {
                    "order_id": order.id,
                    "order_item_id": order_item.id,
                    "quantity": quantity if quantity > 0 else 0,
                    "total_amount": order.total_amount,
                },
            }
        )

    except OrderItem.DoesNotExist:
        return Response(
            {"status": "error", "message": "Позиция в заявке не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["DELETE"])
def api_delete_order(request, order_id):
    """Логическое удаление заявки"""
    try:
        order = Order.objects.get(id=order_id)
        order.status = "deleted"
        order.save()

        return Response(
            {
                "status": "success",
                "message": f"Заявка #{order_id} удалена",
                "data": {"order_id": order.id, "status": order.status},
            }
        )

    except Order.DoesNotExist:
        return Response(
            {"status": "error", "message": "Заявка не найдена"},
            status=status.HTTP_404_NOT_FOUND,
        )
