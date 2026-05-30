from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes


@method_decorator(csrf_exempt, name="dispatch")
class NoCSRFAPIView(APIView):
    """Базовый класс для API без CSRF"""

    permission_classes = [AllowAny]
