from django.urls import path
from . import views

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

    # API маршруты
    path('api/services/', views.api_service_list, name='api_service_list'),
    path('api/services/<int:service_id>/', views.api_service_detail, name='api_service_detail'),
    path('api/order/add/<int:service_id>/', views.api_add_to_order, name='api_add_to_order'),
    path('api/order/item/<int:order_item_id>/', views.api_update_order_item, name='api_update_order_item'),
    path('api/order/<int:order_id>/', views.api_delete_order, name='api_delete_order'),
]

