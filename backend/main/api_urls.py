# backend/main/api_urls.py
from django.urls import path
from . import views

app_name = "api"  # Опционально, если не используешь {% url %} для API

urlpatterns = [
    # 🔹 Services
    path("services/", views.api_service_list, name="service_list"),
    path("services/<int:service_id>/", views.api_service_detail, name="service_detail"),
    path("services/create/", views.api_service_create, name="service_create"),
    # 🔹 Orders
    path("orders/", views.api_order_list, name="order_list"),
    path("orders/<int:order_id>/", views.api_order_detail, name="order_detail"),
    path("orders/<int:order_id>/update/", views.api_order_update, name="order_update"),
    path("orders/<int:order_id>/submit/", views.api_order_submit, name="order_submit"),
    path(
        "orders/<int:order_id>/complete/",
        views.api_order_complete,
        name="order_complete",
    ),
    path("orders/<int:order_id>/reject/", views.api_order_reject, name="order_reject"),
    path("orders/<int:order_id>/delete/", views.api_order_delete, name="order_delete"),
    path("cart-icon/", views.api_cart_icon, name="cart_icon"),
    # 🔹 Order Items
    path("order-item/add/", views.api_order_item_add, name="order_item_add"),
    path(
        "order-item/<int:order_id>/<int:service_id>/update/",
        views.api_order_item_update,
        name="order_item_update",
    ),
    path(
        "order-item/<int:order_id>/<int:service_id>/delete/",
        views.api_order_item_delete,
        name="order_item_delete",
    ),
    # 🔹 Auth
    path("register/", views.api_register, name="register"),
    path("login/", views.api_login, name="login"),
    path("logout/", views.api_logout, name="logout"),
]
