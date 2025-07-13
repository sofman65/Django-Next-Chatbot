import json
import logging
import threading
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Conversation, Message
from shared.logic import general_chat_query, generate_title, database_exists, build_database

# Configure logger
logger = logging.getLogger(__name__)


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
                    for token in general_chat_query(query):
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

    # For GET requests, return API info instead of rendering template
    return JsonResponse({
        "message": "NexiChatbot API", 
        "version": "1.0",
        "status": "✅ Modular Django backend successfully refactored and running",
        "endpoints": {
            "general_chat": "/api/chat/",
            "rag_chat": "/api/rag/chat/",
            "conversations": "/api/conversations/",
            "models": "/api/models/",
            "auth_signup": "/api/auth/signup/",
            "auth_login": "/api/auth/login/",
            "db_status": "/api/db/status/"
        },
        "apps": {
            "authapp": "Authentication & user management",
            "documents": "Conversations & general chat",
            "rag": "RAG chat & document processing"
        }
    })


@csrf_exempt
def chat(request):
    """Handle chat messages and stream responses."""
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            query = body.get("query", "")
            conversation_id = body.get("conversation_id")
            model = body.get("model")  # Let logic.py handle the default model
            
            # Determine provider based on model name or use default
            if model:
                if model.startswith("mistralai/") or model.startswith("microsoft/") or model.startswith("HuggingFaceH4/") or model == "gpt2":
                    provider = "huggingface"
                elif model.startswith("gpt-") or model.startswith("text-") or model.startswith("chatgpt"):
                    provider = "openai"
                else:
                    # Default to huggingface for unknown models
                    provider = "huggingface"
            else:
                # No model specified, use default provider
                provider = "huggingface"
                model = None  # Let logic.py choose the default model
                
            logger.info(f"Chat endpoint called with model: {model}, provider: {provider}")

            if not query:
                return JsonResponse({"error": "No query provided"}, status=400)

            # Create or get conversation
            if not conversation_id:
                conversation = Conversation.objects.create(
                    title=generate_title(query)
                )
                conversation_id = conversation.id
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
                    for token in general_chat_query(query, model=model, provider=provider):
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

    # For GET requests, return API info instead of rendering template  
    return JsonResponse({
        "message": "NexiChatbot Chat API", 
        "endpoint": "/api/documents/chat/",
        "method": "POST",
        "required_fields": ["query"],
        "optional_fields": ["conversation_id", "model"]
    })


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
def create_conversation(request):
    """Create a new conversation."""
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            query = body.get("query", "")  # Optional query for title generation

            # Generate title dynamically if a query is provided
            title = generate_title(query) if query else "New Conversation"

            # Create the conversation with the generated title
            conversation = Conversation.objects.create(title=title)

            return JsonResponse({
                "id": conversation.id,
                "title": conversation.title,
                "createdAt": conversation.created_at.isoformat(),
            }, status=201)
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            return JsonResponse({"error": "An error occurred while creating the conversation."}, status=500)

    return JsonResponse({"error": "Invalid HTTP method."}, status=405)


@csrf_exempt
def conversation_detail(request, conversation_id):
    """Get conversation details including messages."""
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        messages = Message.objects.filter(conversation=conversation)
        
        return JsonResponse({
            'conversation': {
                'id': str(conversation.id),
                'title': conversation.title,
                'createdAt': conversation.created_at.isoformat(),
            },
            'messages': [
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'createdAt': msg.created_at.isoformat(),
                }
                for msg in messages
            ]
        })
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)
    except Exception as e:
        logger.error(f"Error fetching conversation details: {e}")
        return JsonResponse({'error': 'An error occurred'}, status=500)


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
def supported_models(request):
    """Get list of supported models for general chat."""
    try:
        from shared.logic import SUPPORTED_MODELS, DEFAULT_MODELS
        
        return JsonResponse({
            'supported_models': SUPPORTED_MODELS,
            'default_models': DEFAULT_MODELS,
            'providers': list(SUPPORTED_MODELS.keys())
        })
        
    except Exception as e:
        logger.error(f"Error getting supported models: {e}")
        return JsonResponse({'error': str(e)}, status=500)
