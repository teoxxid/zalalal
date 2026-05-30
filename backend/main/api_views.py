from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema, OpenApiExample
import json
import logging
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)


@extend_schema(
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "username": {"type": "string", "description": "Имя пользователя"},
                "password": {"type": "string", "description": "Пароль"},
            },
            "required": ["username", "password"],
        }
    },
    responses={
        200: {"description": "Успешный вход"},
        401: {"description": "Неверные учетные данные"},
    },
    examples=[
        OpenApiExample(
            "Пример запроса",
            value={"username": "admin", "password": "admin123"},
            request_only=True,
        )
    ],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)
        return Response(
            {
                "username": user.username,
                "role": user.role,
                "message": "Login successful",
            }
        )
    else:
        return Response({"error": "Invalid credentials"}, status=401)


@extend_schema(
    responses={
        200: {"description": "Страница пользователя"},
        401: {"description": "Не авторизован"},
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_page(request):
    return Response(
        {
            "message": "Welcome to User Page",
            "role": request.user.role,
            "username": request.user.username,
        }
    )


@extend_schema(
    responses={
        200: {"description": "Страница администратора"},
        401: {"description": "Не авторизован"},
        403: {"description": "Доступ запрещен"},
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_page(request):
    if request.user.role != "ADMIN":
        return Response({"error": "Access denied. Admin only."}, status=403)

    return Response(
        {
            "message": "Welcome to Admin Page",
            "role": request.user.role,
            "username": request.user.username,
        }
    )


#@csrf_exempt
def raw_login(request):
    """Логин без CSRF защиты (для Postman)"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")

            user = authenticate(username=username, password=password)

            if user:
                login(request, user)
                return JsonResponse(
                    {
                        "status": "success",
                        "username": user.username,
                        "role": user.role,
                        "message": "Login successful",
                    }
                )
            else:
                return JsonResponse({"error": "Invalid credentials"}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_add_to_cart(request):
    """Добавление услуги в заявку без CSRF (для Postman)"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            service_id = data.get("service_id")
            quantity = data.get("quantity", 1)

            from .models import Service, Order, OrderItem
            from .utils import get_current_user
            from django.utils import timezone

            user = get_current_user()
            service = Service.objects.get(id=service_id, status="active")

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

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Услуга добавлена в заявку",
                    "data": {
                        "order_id": order.id,
                        "order_item_id": order_item.id,
                        "quantity": order_item.quantity,
                    },
                },
                status=201,
            )

        except Service.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "Услуга не найдена"}, status=404
            )
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_create_service(request):
    """Создание услуги без CSRF (для Postman)"""
    if request.method == "POST":
        try:
            name = request.POST.get("name")
            price = request.POST.get("price")
            description = request.POST.get("description")
            category = request.POST.get("category")
            brand = request.POST.get("brand")
            rating = request.POST.get("rating", 0)
            weight = request.POST.get("weight", 0)

            if not all([name, price, description, category, brand]):
                return JsonResponse(
                    {"status": "error", "message": "Не заполнены обязательные поля"},
                    status=400,
                )

            from .models import Service
            import uuid
            import re

            def simple_slugify(text):
                rus_to_lat = {
                    "а": "a",
                    "б": "b",
                    "в": "v",
                    "г": "g",
                    "д": "d",
                    "е": "e",
                    "ё": "e",
                    "ж": "zh",
                    "з": "z",
                    "и": "i",
                    "й": "y",
                    "к": "k",
                    "л": "l",
                    "м": "m",
                    "н": "n",
                    "о": "o",
                    "п": "p",
                    "р": "r",
                    "с": "s",
                    "т": "t",
                    "у": "u",
                    "ф": "f",
                    "х": "kh",
                    "ц": "ts",
                    "ч": "ch",
                    "ш": "sh",
                    "щ": "sch",
                    "ъ": "",
                    "ы": "y",
                    "ь": "",
                    "э": "e",
                    "ю": "yu",
                    "я": "ya",
                }
                text = text.lower().strip()
                result = ""
                for char in text:
                    if char in rus_to_lat:
                        result += rus_to_lat[char]
                    elif char.isalnum():
                        result += char
                    else:
                        result += "-"
                result = re.sub(r"-+", "-", result)
                return result.strip("-")

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
                    return JsonResponse(
                        {"status": "error", "message": "Ошибка загрузки изображения"},
                        status=500,
                    )

            if "video" in request.FILES:
                video_file = request.FILES["video"]
                ext = video_file.name.split(".")[-1].lower()
                video_key = f"{base_name}_{uuid.uuid4().hex[:8]}.{ext}"
                from .minio_client import upload_file_to_minio

                success = upload_file_to_minio(video_file, video_key)
                if not success:
                    return JsonResponse(
                        {"status": "error", "message": "Ошибка загрузки видео"},
                        status=500,
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

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Услуга успешно создана",
                    "data": {"id": service.id, "name": service.name},
                },
                status=201,
            )

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_update_order_item(request, order_id, service_id):
    """Изменение количества услуги в заявке без CSRF"""
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            quantity = data.get("quantity")

            if quantity is None:
                return JsonResponse({"error": "Не указано количество"}, status=400)

            from .models import Order, Service, OrderItem
            from .utils import get_current_user

            order = get_object_or_404(Order, id=order_id)
            service = get_object_or_404(Service, id=service_id)
            user = get_current_user()

            if order.user.id != user.id:
                return JsonResponse(
                    {"error": "Нельзя редактировать чужую заявку"}, status=403
                )

            if order.status != "draft":
                return JsonResponse(
                    {"error": "Редактировать можно только черновик"}, status=400
                )

            order_item = get_object_or_404(OrderItem, order=order, service=service)
            order_item.quantity = quantity
            order_item.save()

            return JsonResponse(
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
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_delete_order_item(request, order_id, service_id):
    """Удаление услуги из заявки без CSRF"""
    if request.method == "DELETE":
        try:
            from .models import Order, Service, OrderItem
            from .utils import get_current_user

            order = get_object_or_404(Order, id=order_id)
            service = get_object_or_404(Service, id=service_id)
            user = get_current_user()

            if order.user.id != user.id:
                return JsonResponse(
                    {"error": "Нельзя удалить из чужой заявки"}, status=403
                )

            order_item = get_object_or_404(OrderItem, order=order, service=service)
            order_item.delete()

            return JsonResponse(
                {"status": "success", "message": "Услуга удалена из заявки"}
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_update_order(request, order_id):
    """Обновление заявки без CSRF"""
    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            delivery_address = data.get("delivery_address")

            from .models import Order
            from .utils import get_current_user

            order = get_object_or_404(Order, id=order_id)
            user = get_current_user()

            if order.user.id != user.id:
                return JsonResponse(
                    {"error": "Нельзя редактировать чужую заявку"}, status=403
                )

            if order.status != "draft":
                return JsonResponse(
                    {"error": "Редактировать можно только черновик"}, status=400
                )

            if delivery_address:
                order.delivery_address = delivery_address

            order.save()

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Заявка обновлена",
                    "data": {
                        "id": order.id,
                        "delivery_address": order.delivery_address,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_submit_order(request, order_id):
    """Формирование заявки без CSRF (расчёт стоимости и доставки)"""
    if request.method == "PUT":
        try:
            from .models import Order, OrderItem
            from .utils import get_current_user
            from django.utils import timezone
            from datetime import timedelta

            order = get_object_or_404(Order, id=order_id)
            user = get_current_user()

            if order.user.id != user.id:
                return JsonResponse(
                    {"error": "Нельзя сформировать чужую заявку"}, status=403
                )

            if order.status != "draft":
                return JsonResponse(
                    {"error": "Сформировать можно только черновик"}, status=400
                )

            if not order.delivery_address:
                return JsonResponse({"error": "Не указан адрес доставки"}, status=400)

            items = OrderItem.objects.filter(order=order)
            if not items.exists():
                return JsonResponse(
                    {"error": "Нельзя сформировать пустую заявку"}, status=400
                )

            total = sum(
                float(item.quantity) * float(item.price_at_time) for item in items
            )
            order.total_amount = total
            order.delivery_date = timezone.now().date() + timedelta(days=7)
            order.delivery_cost = max(total * 0.05, 300)
            order.status = "submitted"
            order.submitted_at = timezone.now()
            order.save()

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Заявка сформирована",
                    "data": {
                        "id": order.id,
                        "total_amount": str(order.total_amount),
                        "delivery_cost": str(order.delivery_cost),
                        "delivery_date": str(order.delivery_date),
                        "status": order.status,
                    },
                }
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_complete_order(request, order_id):
    """Завершение заявки без CSRF (только для модератора)"""
    if request.method == "PUT":
        try:
            from .models import Order, OrderItem
            from django.utils import timezone

            order = get_object_or_404(Order, id=order_id)

            # Проверка: только модератор (ADMIN) может завершить заявку
            if request.user.role != "ADMIN":
                return JsonResponse(
                    {"error": "Только модератор может завершить заявку"}, status=403
                )

            if order.status != "submitted":
                return JsonResponse(
                    {"error": "Завершить можно только сформированную заявку"},
                    status=400,
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

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Заявка завершена",
                    "data": {"id": order.id, "status": order.status},
                }
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_reject_order(request, order_id):
    """Отклонение заявки без CSRF (только для модератора)"""
    if request.method == "PUT":
        try:
            from .models import Order
            from django.utils import timezone

            order = get_object_or_404(Order, id=order_id)

            # Проверка: только модератор (ADMIN) может отклонить заявку
            if request.user.role != "ADMIN":
                return JsonResponse(
                    {"error": "Только модератор может отклонить заявку"}, status=403
                )

            if order.status != "submitted":
                return JsonResponse(
                    {"error": "Отклонить можно только сформированную заявку"},
                    status=400,
                )

            order.status = "rejected"
            order.completed_at = timezone.now()
            order.moderator = request.user
            order.save()

            return JsonResponse(
                {
                    "status": "success",
                    "message": "Заявка отклонена",
                    "data": {"id": order.id, "status": order.status},
                }
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_delete_order(request, order_id):
    """Логическое удаление заявки без CSRF"""
    if request.method == "DELETE":
        try:
            from .models import Order
            from .utils import get_current_user

            order = get_object_or_404(Order, id=order_id)
            user = get_current_user()

            if order.user.id != user.id:
                return JsonResponse(
                    {"error": "Нельзя удалить чужую заявку"}, status=403
                )

            if order.status not in ["draft", "submitted", "completed"]:
                return JsonResponse(
                    {"error": "Нельзя удалить заявку в этом статусе"}, status=400
                )

            order.status = "deleted"
            order.save()

            return JsonResponse({"status": "success", "message": "Заявка удалена"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)


#@csrf_exempt
def raw_register(request):
    """Регистрация пользователя без CSRF"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")
            email = data.get("email")

            from .serializers import UserSerializer

            serializer = UserSerializer(
                data={"username": username, "password": password, "email": email}
            )

            if serializer.is_valid():
                user = serializer.save()
                return JsonResponse(
                    {
                        "status": "success",
                        "message": "Пользователь зарегистрирован",
                        "data": {
                            "id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "role": user.role,
                        },
                    },
                    status=201,
                )
            else:
                return JsonResponse(
                    {"status": "error", "errors": serializer.errors}, status=400
                )

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)
