import pytest
from rest_framework import status
from main.models import Service

pytestmark = [pytest.mark.integration, pytest.mark.django_db, pytest.mark.services]


class TestServiceListAPI:
    """Integration-тесты для GET /api/services/"""

    def test_get_services_list_success(self, api_client, sample_services):
        """Позитивный сценарий: получение списка услуг"""
        response = api_client.get("/api/services/")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "success"
        assert len(response.json()["data"]) == len(sample_services)

    def test_get_services_with_filter(self, api_client):
        """Фильтрация по названию"""
        # Создаём сервисы с разными названиями
        Service.objects.create(
            name="iPhone Test",
            price=1000,
            description="Test",
            category="Phones",
            brand="Apple",
        )
        Service.objects.create(
            name="Samsung Test",
            price=900,
            description="Test",
            category="Phones",
            brand="Samsung",
        )

        response = api_client.get("/api/services/?name=iPhone")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["data"]) == 1
        assert response.json()["data"][0]["name"] == "iPhone Test"

    def test_get_services_only_active(self, api_client):
        """Должны возвращаться только активные сервисы"""
        Service.objects.create(
            name="Active",
            price=100,
            description="Test",
            category="Test",
            brand="Test",
            status="active",
        )
        Service.objects.create(
            name="Inactive",
            price=100,
            description="Test",
            category="Test",
            brand="Test",
            status="deleted",
        )

        response = api_client.get("/api/services/")

        assert response.status_code == status.HTTP_200_OK
        names = [s["name"] for s in response.json()["data"]]
        assert "Active" in names
        assert "Inactive" not in names


class TestServiceDetailAPI:
    """Integration-тесты для GET /api/services/<id>/"""

    def test_get_service_detail_success(self, api_client, sample_service):
        """Позитивный сценарий: получение детали сервиса"""
        response = api_client.get(f"/api/services/{sample_service.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["id"] == sample_service.id
        assert response.json()["data"]["name"] == sample_service.name

    def test_get_nonexistent_service(self, api_client):
        """Негативный сценарий: запрос несуществующего сервиса"""
        response = api_client.get("/api/services/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["status"] == "error"
