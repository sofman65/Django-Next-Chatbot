from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from .models import Conversation, Message
from .logic import answer_query, generate_title, build_database, database_exists
import threading
import json
import logging
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
# Configure logger
logger = logging.getLogger(__name__)

#----- Authentication----

User = get_user_model()

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        password = data.get('password')
        role_name = data.get('role_name')
        role = Role.objects.get(name=role_name)

        user = User.objects.create_user(username=username, password=password, role=role)

        return Response({'message': 'User created successfully'}, status=201)
    
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
    
    
@csrf_exempt
def index(request):
    """Handle user queries and stream chatbot answers progressively."""
    if request.method == 'POST':
        try:
            query = request.POST.get('query')
            if not query:
                body = json.loads(request.body)
                logger.debug(f"Request body: {body}")
                query = body.get("query", "")

            if not query:
                logger.warning("No query provided in the request.")
                return JsonResponse({"error": "No query provided"}, status=400)

            def event_stream():
                """Stream tokens from the chatbot."""
                try:
                    for token in answer_query(query):
                        yield f"data: {json.dumps(token)}\n\n"  # SSE format
                except Exception as e:
                    logger.error(f"Error during streaming: {e}")
                    yield f"data: {json.dumps({'error': 'An error occurred during streaming'})}\n\n"

            return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return JsonResponse({"error": "An error occurred while processing the query"}, status=500)

    return render(request, 'djangoapp/index.html')

@csrf_exempt
def db_status(request):
    """Check the status of the Chroma database."""
    try:
        exists = database_exists()
        status = {'exists': exists, 'message': 'Database exists' if exists else 'Database is being built'}
        logger.debug(f"Database status: {status}")
        return JsonResponse(status)
    except Exception as e:
        logger.error(f"Error checking database status: {e}")
        return JsonResponse({"error": "Error checking database status"}, status=500)

@csrf_exempt
def build_db(request):
    """Start a thread to build the Chroma database asynchronously."""
    is_building = False
    if is_building:
        return JsonResponse({'status': 'Database is already being built.'})
    
    is_building = True
    try:
        thread = threading.Thread(target=build_database)
        thread.start()
        logger.info("Database building started.")
        return JsonResponse({'status': 'Building database...'})
    finally:
        is_building = False

@csrf_exempt
def chat(request):
    """Handle chat messages and stream responses."""
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            query = body.get("query", "")
            conversation_id = body.get("conversation_id")

            if not query:
                return JsonResponse({"error": "No query provided"}, status=400)

            # Create or get conversation
            if not conversation_id:
                conversation = Conversation.objects.create(
                    title=generate_title(query)
                )
                # Send the conversation ID in the first chunk
                yield f"data: {json.dumps({'conversation_id': str(conversation.id)})}\n\n"
            else:
                try:
                    conversation = Conversation.objects.get(id=conversation_id)
                except Conversation.DoesNotExist:
                    return JsonResponse({"error": "Conversation not found"}, status=404)

            # Save user message
            Message.objects.create(
                conversation=conversation,
                role='user',
                content=query
            )

            def event_stream():
                """Stream tokens from the chatbot."""
                response_content = []
                try:
                    for token in answer_query(query):
                        response_content.append(token.get('answer', ''))
                        yield f"data: {json.dumps(token)}\n\n"
                except Exception as e:
                    logger.error(f"Error during streaming: {e}")
                    yield f"data: {json.dumps({'error': 'An error occurred during streaming'})}\n\n"
                finally:
                    # Save assistant message
                    if response_content:
                        Message.objects.create(
                            conversation=conversation,
                            role='assistant',
                            content=''.join(response_content)
                        )

            return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return JsonResponse({"error": "An error occurred while processing the query"}, status=500)

    return render(request, 'djangoapp/index.html')



@csrf_exempt
def conversations(request):
    """Get all conversations."""
    conversations = Conversation.objects.all()
    return JsonResponse({
        'conversations': [
            {
                'id': str(conv.id),
                'title': conv.title,
                'createdAt': conv.created_at.isoformat(),
            }
            for conv in conversations
        ]
    })

@csrf_exempt
def conversation_detail(request, conversation_id):
    """Get conversation details including messages."""
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        messages = conversation.messages.all()
        return JsonResponse({
            'conversation': {
                'id': str(conversation.id),
                'title': conversation.title,
                'createdAt': conversation.created_at.isoformat(),
                'messages': [
                    {
                        'id': str(msg.id),
                        'role': msg.role,
                        'content': msg.content,
                        'createdAt': msg.created_at.isoformat(),
                    }
                    for msg in messages
                ]
            }
        })
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)
