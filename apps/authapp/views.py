import logging
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError

from .models import Role

# Configure logger
logger = logging.getLogger(__name__)

User = get_user_model()


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'role': user.role.name if user.role else None,
        })


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        
        # Validate required fields
        if not username or not password:
            return Response({'detail': 'Username and password are required'}, status=400)
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return Response({'detail': 'User with this username already exists'}, status=400)
        
        # Check if email already exists (if provided)
        if email and User.objects.filter(email=email).exists():
            return Response({'detail': 'User with this email already exists'}, status=400)
        
        try:
            # Get default role or set to None if roles aren't used
            default_role = None
            try:
                default_role = Role.objects.get(name='user')
            except Role.DoesNotExist:
                pass  # Role model might not be used
            
            # Create the user
            user_data = {
                'username': username,
                'password': password,
                'first_name': first_name,
                'last_name': last_name,
            }
            
            if email:
                user_data['email'] = email
                
            if default_role:
                user_data['role'] = default_role
                
            user = User.objects.create_user(**user_data)

            return Response({
                'message': 'User created successfully',
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }, status=201)
            
        except Exception as e:
            return Response({'detail': str(e)}, status=500)
    

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        password = data.get('password')

        user = User.objects.filter(username=username).first()
        if user and user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return Response({'refresh': str(refresh), 'access': str(refresh.access_token)}, status=200)
        return Response({'error': 'Invalid credentials'}, status=400)
    

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    

class TokenRefreshView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh = RefreshToken(refresh_token)
            new_access_token = str(refresh.access_token)
            
            return Response({
                'access': new_access_token
            }, status=status.HTTP_200_OK)
            
        except TokenError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
