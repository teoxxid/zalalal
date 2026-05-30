# backend/marketplace/urls.py
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # 🔹 Админка
    path("admin/", admin.site.urls),
    # 🔹 Все маршруты приложения main — на корне
    # Сюда входят: API, HTML-страницы, login, register
    path("", include("main.urls")),
    # 🔹 Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"
    ),
    # 🔹 Prometheus метрики
    path("", include("django_prometheus.urls")),
]
