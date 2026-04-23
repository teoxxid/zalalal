from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import authenticate, login
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        login(request, user)
        return Response({
            'username': user.username,
            'role': user.role,
            'message': 'Login successful'
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=401)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_page(request):
    return Response({
        'message': 'Welcome to User Page',
        'role': request.user.role,
        'username': request.user.username
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_page(request):
    if request.user.role != 'ADMIN':
        return Response({'error': 'Access denied. Admin only.'}, status=403)
    
    return Response({
        'message': 'Welcome to Admin Page',
        'role': request.user.role,
        'username': request.user.username
    })
