# backend/main/html_urls.py
from django.urls import path
from . import views

app_name = "main"

urlpatterns = [
    # 🔹 Главная страница (пустой путь → /pages/)
    path("", views.index, name="index"),
    # 🔹 Каталог и товары
    path("catalog/", views.service_list, name="service_list"),
    path("service/<int:service_id>/", views.service_detail, name="service_detail"),
    # 🔹 Заявки
    path("order/<int:order_id>/", views.order_detail, name="order_detail"),
    path("orders/", views.order_list, name="order_list"),
    # 🔹 Действия с заявками
    path("order/add/<int:service_id>/", views.add_to_order, name="add_to_order"),
    path("order/delete/<int:order_id>/", views.delete_order, name="delete_order"),
    path("order/complete/<int:order_id>/", views.complete_order, name="complete_order"),
]
