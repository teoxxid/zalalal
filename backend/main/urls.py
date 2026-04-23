from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    # HTML страницы
    path('', views.index, name='index'),
    path('catalog/', views.service_list, name='service_list'),
    path('service/<int:service_id>/', views.service_detail, name='service_detail'),
    path('orders/', views.order_list, name='order_list'),
    path('order/<int:order_id>/', views.order_detail, name='order_detail'),
    path('order/add/<int:service_id>/', views.add_to_order, name='add_to_order'),
    path('order/delete/<int:order_id>/', views.delete_order, name='delete_order'),
    path('order/complete/<int:order_id>/', views.complete_order, name='complete_order'),
    
    # API эндпоинты (без /api/, так как префикс добавлен в marketplace/urls.py)
    path('services/', views.api_service_list, name='api_service_list'),
    path('services/<int:service_id>/', views.api_service_detail, name='api_service_detail'),
    path('services/create/', views.api_service_create, name='api_service_create'),
    path('orders/cart/', views.api_cart_icon, name='api_cart_icon'),
    path('orders/', views.api_order_list, name='api_order_list'),
    path('orders/<int:order_id>/', views.api_order_detail, name='api_order_detail'),
    path('orders/<int:order_id>/update/', views.api_order_update, name='api_order_update'),
    path('orders/<int:order_id>/submit/', views.api_order_submit, name='api_order_submit'),
    path('orders/<int:order_id>/complete/', views.api_order_complete, name='api_order_complete'),
    path('orders/<int:order_id>/reject/', views.api_order_reject, name='api_order_reject'),
    path('orders/<int:order_id>/delete/', views.api_order_delete, name='api_order_delete'),
    path('order-items/add/', views.api_order_item_add, name='api_order_item_add'),
    path('order-items/<int:order_id>/<int:service_id>/update/', views.api_order_item_update, name='api_order_item_update'),
    path('order-items/<int:order_id>/<int:service_id>/delete/', views.api_order_item_delete, name='api_order_item_delete'),
    path('register/', views.api_register, name='api_register'),
    path('login/', api_views.login_view, name='api_login'),
    path('logout/', views.api_logout, name='api_logout'),
    
    # Защищённые страницы для ЛР4
    path('user-page/', api_views.user_page, name='user_page'),
    path('admin-page/', api_views.admin_page, name='admin_page'),
]
