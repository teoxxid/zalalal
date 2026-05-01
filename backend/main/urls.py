from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    # ===== API МАРШРУТЫ (должны быть первыми) =====
    path('api/services/', views.api_service_list, name='api_service_list'),
    path('api/services/<int:service_id>/', views.api_service_detail, name='api_service_detail'),
    path('api/services/create/', views.api_service_create, name='api_service_create'),
    path('api/orders/cart/', views.api_cart_icon, name='api_cart_icon'),
    path('api/orders/', views.api_order_list, name='api_order_list'),
    path('api/orders/<int:order_id>/', views.api_order_detail, name='api_order_detail'),
    path('api/orders/<int:order_id>/update/', views.api_order_update, name='api_order_update'),
    path('api/orders/<int:order_id>/submit/', views.api_order_submit, name='api_order_submit'),
    path('api/orders/<int:order_id>/complete/', views.api_order_complete, name='api_order_complete'),
    path('api/orders/<int:order_id>/reject/', views.api_order_reject, name='api_order_reject'),
    path('api/orders/<int:order_id>/delete/', views.api_order_delete, name='api_order_delete'),
    path('api/order-items/add/', views.api_order_item_add, name='api_order_item_add'),
    path('api/order-items/<int:order_id>/<int:service_id>/update/', views.api_order_item_update, name='api_order_item_update'),
    path('api/order-items/<int:order_id>/<int:service_id>/delete/', views.api_order_item_delete, name='api_order_item_delete'),
    path('api/register/', views.api_register, name='api_register'),
    path('api/login/', api_views.login_view, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/user-page/', api_views.user_page, name='user_page'),
    path('api/admin-page/', api_views.admin_page, name='admin_page'),
    
    # ===== RAW API (без CSRF) =====
    path('api/raw-login/', api_views.raw_login, name='raw_login'),
    path('api/raw-add-to-cart/', api_views.raw_add_to_cart, name='raw_add_to_cart'),
    path('api/raw-create-service/', api_views.raw_create_service, name='raw_create_service'),
    path('api/raw-update-order-item/<int:order_id>/<int:service_id>/', api_views.raw_update_order_item, name='raw_update_order_item'),
    path('api/raw-delete-order-item/<int:order_id>/<int:service_id>/', api_views.raw_delete_order_item, name='raw_delete_order_item'),
    path('api/raw-update-order/<int:order_id>/', api_views.raw_update_order, name='raw_update_order'),
    path('api/raw-submit-order/<int:order_id>/', api_views.raw_submit_order, name='raw_submit_order'),
    path('api/raw-complete-order/<int:order_id>/', api_views.raw_complete_order, name='raw_complete_order'),
    path('api/raw-reject-order/<int:order_id>/', api_views.raw_reject_order, name='raw_reject_order'),
    path('api/raw-delete-order/<int:order_id>/', api_views.raw_delete_order, name='raw_delete_order'),
    path('api/raw-register/', api_views.raw_register, name='raw_register'),
    
    # ===== HTML СТРАНИЦЫ (теперь с префиксом /pages/, чтобы не пересекаться с API) =====
    path('pages/', views.index, name='index'),
    path('pages/catalog/', views.service_list, name='service_list'),
    path('pages/service/<int:service_id>/', views.service_detail, name='service_detail'),
    path('pages/orders/', views.order_list, name='order_list'),
    path('pages/order/<int:order_id>/', views.order_detail, name='order_detail'),
    path('pages/order/add/<int:service_id>/', views.add_to_order, name='add_to_order'),
    path('pages/order/delete/<int:order_id>/', views.delete_order, name='delete_order'),
    path('pages/order/complete/<int:order_id>/', views.complete_order, name='complete_order'),
]
