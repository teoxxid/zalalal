from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import timedelta
from .utils import get_current_user, get_moderator_user

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
def api_service_create(request):
    """POST добавление новой услуги"""
    try:
        name = request.data.get("name")
        price = request.data.get("price")
        description = request.data.get("description", "")
        category = request.data.get("category", "")
        brand = request.data.get("brand", "")
        
        if not name or not price:
            return Response(
                {"status": "error", "message": "Не указаны обязательные поля"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        service = Service.objects.create(
            name=name,
            price=price,
            description=description,
            category=category,
            brand=brand,
            status="active"
        )
        
        return Response(
            {"status": "success", "data": {"id": service.id}},
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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


@api_view(["GET"])
def api_cart_icon(request):
    """GET иконки корзины"""
    user = get_current_user()
    try:
        draft_order = Order.objects.get(user=user, status="draft")
        items_count = OrderItem.objects.filter(order=draft_order).count()
        return Response({
            "status": "success", 
            "data": {"order_id": draft_order.id, "items_count": items_count}
        })
    except Order.DoesNotExist:
        return Response({"status": "success", "data": {"order_id": None, "items_count": 0}})


@api_view(["GET"])
def api_order_list(request):
    """GET список заявок с фильтрацией"""
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
    
    data = []
    for order in orders:
        data.append({
            "id": order.id,
            "status": order.status,
            "total_amount": str(order.total_amount),
            "created_at": order.created_at,
            "submitted_at": order.submitted_at
        })
    
    return Response({"status": "success", "data": data})


@api_view(["GET"])
def api_order_detail(request, order_id):
    """GET одна заявка с услугами"""
    try:
        order = Order.objects.get(id=order_id)
        if order.status == "deleted":
            return Response({"status": "error", "message": "Заявка удалена"}, status=404)
        
        items = []
        for item in order.items.select_related("service"):
            items.append({
                "id": item.id,
                "service_id": item.service.id,
                "service_name": item.service.name,
                "quantity": item.quantity,
                "price": str(item.price_at_time),
                "image_url": f"http://localhost:9000/services/{item.service.image_key}" if item.service.image_key else None
            })
        
        return Response({
            "status": "success",
            "data": {
                "id": order.id,
                "status": order.status,
                "total_amount": str(order.total_amount),
                "delivery_address": order.delivery_address,
                "created_at": order.created_at,
                "submitted_at": order.submitted_at,
                "items": items
            }
        })
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["PUT"])
def api_order_update(request, order_id):
    """PUT изменения полей заявки"""
    try:
        order = Order.objects.get(id=order_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя редактировать чужую заявку"}, status=403)
        
        if order.status != "draft":
            return Response({"status": "error", "message": "Редактировать можно только черновик"}, status=400)
        
        delivery_address = request.data.get("delivery_address")
        if delivery_address:
            order.delivery_address = delivery_address
        
        order.save()
        
        return Response({
            "status": "success",
            "message": "Заявка обновлена",
            "data": {"order_id": order.id, "delivery_address": order.delivery_address}
        })
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["PUT"])
def api_order_submit(request, order_id):
    """PUT сформировать заявку (с расчётом)"""
    try:
        order = Order.objects.get(id=order_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя сформировать чужую заявку"}, status=403)
        
        if order.status != "draft":
            return Response({"status": "error", "message": "Сформировать можно только черновик"}, status=400)
        
        if not order.delivery_address:
            return Response({"status": "error", "message": "Не указан адрес доставки"}, status=400)
        
        items = order.items.all()
        if not items.exists():
            return Response({"status": "error", "message": "Нельзя сформировать пустую заявку"}, status=400)
        
        total = sum(item.quantity * item.price_at_time for item in items)
        order.total_amount = total
        order.delivery_date = timezone.now().date() + timedelta(days=7)
        order.delivery_cost = max(float(total) * 0.05, 300)
        order.status = "submitted"
        order.submitted_at = timezone.now()
        order.save()
        
        return Response({
            "status": "success",
            "message": "Заявка сформирована",
            "data": {
                "order_id": order.id,
                "total_amount": str(order.total_amount),
                "delivery_cost": str(order.delivery_cost),
                "delivery_date": order.delivery_date
            }
        })
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["PUT"])
def api_order_complete(request, order_id):
    """PUT завершить заявку модератором"""
    try:
        order = Order.objects.get(id=order_id)
        
        if order.status != "submitted":
            return Response({"status": "error", "message": "Завершить можно только сформированную заявку"}, status=400)
        
        order.status = "completed"
        order.completed_at = timezone.now()
        order.save()
        
        return Response({
            "status": "success",
            "message": "Заявка завершена",
            "data": {"order_id": order.id, "status": order.status, "completed_at": order.completed_at}
        })
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["PUT"])
def api_order_reject(request, order_id):
    """PUT отклонить заявку модератором"""
    try:
        order = Order.objects.get(id=order_id)
        
        if order.status != "submitted":
            return Response({"status": "error", "message": "Отклонить можно только сформированную заявку"}, status=400)
        
        order.status = "rejected"
        order.completed_at = timezone.now()
        order.save()
        
        return Response({
            "status": "success",
            "message": "Заявка отклонена",
            "data": {"order_id": order.id, "status": order.status}
        })
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["DELETE"])
def api_order_delete(request, order_id):
    """DELETE логическое удаление заявки"""
    try:
        order = Order.objects.get(id=order_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя удалить чужую заявку"}, status=403)
        
        if order.status not in ["draft", "submitted"]:
            return Response({"status": "error", "message": "Нельзя удалить заявку в этом статусе"}, status=400)
        
        order.status = "deleted"
        order.save()
        
        return Response({"status": "success", "message": "Заявка удалена", "data": {"order_id": order.id}})
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["POST"])
def api_order_item_add(request):
    """POST добавление услуги в заявку-черновик"""
    try:
        service_id = request.data.get("service_id")
        quantity = int(request.data.get("quantity", 1))
        
        service = Service.objects.get(id=service_id, status="active")
        user = get_current_user()
        
        order, created = Order.objects.get_or_create(
            user=user,
            status="draft",
            defaults={"created_at": timezone.now(), "total_amount": 0}
        )
        
        order_item, item_created = OrderItem.objects.get_or_create(
            order=order,
            service=service,
            defaults={"quantity": quantity, "price_at_time": service.price}
        )
        
        if not item_created:
            order_item.quantity += quantity
            order_item.save()
        
        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        order.total_amount = total
        order.save()
        
        return Response({
            "status": "success",
            "message": "Услуга добавлена в заявку",
            "data": {"order_id": order.id, "quantity": order_item.quantity}
        }, status=201)
        
    except Service.DoesNotExist:
        return Response({"status": "error", "message": "Услуга не найдена"}, status=404)


@api_view(["PUT"])
def api_order_item_update(request, order_id, service_id):
    """PUT изменение количества в м-м (без PK)"""
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя редактировать чужую заявку"}, status=403)
        
        if order.status != "draft":
            return Response({"status": "error", "message": "Редактировать можно только черновик"}, status=400)
        
        quantity = request.data.get("quantity")
        if quantity is None:
            return Response({"status": "error", "message": "Не указано количество"}, status=400)
        
        try:
            quantity = int(quantity)
        except ValueError:
            return Response({"status": "error", "message": "Количество должно быть числом"}, status=400)
        
        order_item = get_object_or_404(OrderItem, order=order, service=service)
        
        if quantity <= 0:
            order_item.delete()
            message = "Услуга удалена из заявки"
        else:
            order_item.quantity = quantity
            order_item.save()
            message = "Количество обновлено"
        
        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        order.total_amount = total
        order.save()
        
        return Response({
            "status": "success",
            "message": message,
            "data": {"order_id": order.id, "service_id": service.id, "quantity": quantity}
        })
        
    except OrderItem.DoesNotExist:
        return Response({"status": "error", "message": "Услуга не найдена в заявке"}, status=404)


@api_view(["DELETE"])
def api_order_item_delete(request, order_id, service_id):
    """DELETE удаление из заявки (без PK)"""
    try:
        order = get_object_or_404(Order, id=order_id)
        service = get_object_or_404(Service, id=service_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя удалить из чужой заявки"}, status=403)
        
        if order.status != "draft":
            return Response({"status": "error", "message": "Удалять можно только из черновика"}, status=400)
        
        order_item = get_object_or_404(OrderItem, order=order, service=service)
        order_item.delete()
        
        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        order.total_amount = total
        order.save()
        
        return Response({"status": "success", "message": "Услуга удалена из заявки"})
        
    except OrderItem.DoesNotExist:
        return Response({"status": "error", "message": "Услуга не найдена в заявке"}, status=404)


@api_view(["PUT"])
def api_update_order_item(request, order_item_id):
    """Обновление количества товара в заявке (по PK)"""
    try:
        order_item = OrderItem.objects.get(id=order_item_id)
        quantity = request.data.get("quantity")
        
        if quantity is None:
            return Response({"status": "error", "message": "Не указано количество"}, status=400)
        
        try:
            quantity = int(quantity)
        except ValueError:
            return Response({"status": "error", "message": "Количество должно быть числом"}, status=400)
        
        if quantity <= 0:
            order_item.delete()
            message = "Товар удалён из заявки"
        else:
            order_item.quantity = quantity
            order_item.save()
            message = "Количество обновлено"
        
        order = order_item.order
        total = sum(item.quantity * item.price_at_time for item in order.items.all())
        order.total_amount = total
        order.save()
        
        return Response({
            "status": "success",
            "message": message,
            "data": {
                "order_id": order.id,
                "order_item_id": order_item.id,
                "quantity": quantity if quantity > 0 else 0,
                "total_amount": order.total_amount,
            }
        })
        
    except OrderItem.DoesNotExist:
        return Response({"status": "error", "message": "Позиция в заявке не найдена"}, status=404)


@api_view(["DELETE"])
def api_delete_order(request, order_id):
    """DELETE удаление заявки"""
    try:
        order = Order.objects.get(id=order_id)
        user = get_current_user()
        
        if order.user.id != user.id:
            return Response({"status": "error", "message": "Нельзя удалить чужую заявку"}, status=403)
        
        order.status = "deleted"
        order.save()
        
        return Response({
            "status": "success",
            "message": f"Заявка #{order_id} удалена",
            "data": {"order_id": order.id, "status": order.status}
        })
        
    except Order.DoesNotExist:
        return Response({"status": "error", "message": "Заявка не найдена"}, status=404)


@api_view(["POST"])
def api_register(request):
    """POST регистрация пользователя"""
    try:
        username = request.data.get("username")
        password = request.data.get("password")
        email = request.data.get("email", "")
        
        if not username or not password:
            return Response({"status": "error", "message": "Не указаны username или password"}, status=400)
        
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        
        return Response({
            "status": "success",
            "message": "Пользователь зарегистрирован",
            "data": {"username": user.username}
        }, status=201)
        
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=400)


# ========== ЗАЩИЩЁННЫЕ СТРАНИЦЫ ДЛЯ ЛР4 ==========

@api_view(['GET'])
def user_page(request):
    """Страница для авторизованных пользователей (USER и ADMIN)"""
    return Response({
        "status": "success",
        "message": "Добро пожаловать на страницу пользователя!",
        "user": request.user.username,
        "role": request.user.role if hasattr(request.user, 'role') else 'USER'
    })


@api_view(['GET'])
def admin_page(request):
    """Страница только для администраторов"""
    # Проверка роли
    if not hasattr(request.user, 'role') or request.user.role != 'ADMIN':
        return Response({
            "status": "error",
            "message": "Доступ запрещён. Только для администраторов."
        }, status=403)
    
    return Response({
        "status": "success",
        "message": "Добро пожаловать на страницу администратора!",
        "user": request.user.username,
        "role": request.user.role
    })

@api_view(["POST"])
def api_login(request):
    """POST аутентификация (заглушка для ЛР4)"""
    return Response({"status": "success", "message": "Аутентификация будет в ЛР4"})


@api_view(["POST"])
def api_logout(request):
    """POST деавторизация (заглушка для ЛР4)"""
    return Response({"status": "success", "message": "Деавторизация будет в ЛР4"})
