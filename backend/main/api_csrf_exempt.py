from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView

def csrf_exempt_api(view_func):
    """Декоратор для отключения CSRF для API view"""
    return csrf_exempt(view_func)
