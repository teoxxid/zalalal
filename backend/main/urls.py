from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    path('pages/', views.index, name='home'),
    path('pages/catalog/', views.service_list, name='service_list'),
    path('pages/service/<int:service_id>/', views.service_detail, name='service_detail'),
    path('pages/order/<int:order_id>/', views.order_detail, name='order_detail'),
    path('pages/orders/', views.order_list, name='order_list'),
    path('pages/cart/', views.order_detail, name='cart'),
    path('pages/user-page/', views.index, name='user_page'),
    path('pages/admin-page/', views.index, name='admin_page'),
    
    path('login/', views.login_page, name='login_page'),
    path('register/', views.register_page, name='register_page'),
    path('logout/', views.logout_page, name='logout_page'),
    
    path('add-to-order/<int:service_id>/', views.add_to_order, name='add_to_order'),
    path('delete-order/<int:order_id>/', views.delete_order, name='delete_order'),
    path('complete-order/<int:order_id>/', views.complete_order, name='complete_order'),
    
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
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/auth/me/', views.api_auth_me, name='api_auth_me'),
    path('api/users/', views.api_user_list, name='api_user_list'),
    path('api/users/<int:user_id>/', views.api_user_detail, name='api_user_detail'),
    
    path('api/schema/', views.api_schema, name='api_schema'),
    path('api/docs/', views.api_docs, name='api_docs'),
]
