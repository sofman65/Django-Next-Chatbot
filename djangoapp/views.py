import json
import logging
import threading
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Conversation, Message, Role, Document, DocumentSet, ProcessingPipeline
from .logic import general_chat_query, generate_title, database_exists, build_database
from .advanced_rag_logic import rag_manager
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError
# Configure logger
logger = logging.getLogger(__name__)

#----- Authentication----

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
            except:
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

@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request):
    """Upload documents for RAG processing"""
    try:
        # Check for multiple files (from frontend) or single file (legacy)
        files = request.FILES.getlist('files') or [request.FILES.get('file')]
        files = [f for f in files if f is not None]  # Filter out None values
        
        if not files:
            return JsonResponse({'error': 'No files provided'}, status=400)
        
        document_set_name = request.POST.get('document_set_name', 'default')
        
        uploaded_documents = []
        
        for file in files:
            # Validate file type
            if not file.name.lower().endswith('.pdf'):
                return JsonResponse({'error': f'Only PDF files are supported. "{file.name}" is not a PDF.'}, status=400)
            
            # Upload document
            document = rag_manager.upload_document(
                document_set_name=document_set_name,
                file=file,
                title=file.name,
                user=request.user if hasattr(request, 'user') else None
            )
            
            uploaded_documents.append({
                'document_id': document.id,
                'title': document.title,
                'status': document.status
            })
        
        return JsonResponse({
            'success': True,
            'document_set': document_set_name,
            'uploaded_documents': uploaded_documents,
            'count': len(uploaded_documents),
            'message': f'Successfully uploaded {len(uploaded_documents)} document(s) to "{document_set_name}". Processing will begin shortly.'
        })
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@csrf_exempt
def start_pipeline(request):
    """Start or restart the RAG processing pipeline for a document set"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        document_set_name = data.get('document_set_name') or data.get('document_set')
        force_rebuild = data.get('force_rebuild', False)
        
        logger.info(f"Start pipeline request for: {document_set_name}, force_rebuild: {force_rebuild}")
        
        if not document_set_name:
            return JsonResponse({'error': 'Document set name is required'}, status=400)
        
        # Check if pipeline is already running
        try:
            document_set = DocumentSet.objects.get(name=document_set_name)
            pipeline_obj = ProcessingPipeline.objects.get(document_set=document_set)
            
            if pipeline_obj.status in ['parsing', 'indexing']:
                return JsonResponse({
                    'error': f'Pipeline is already running for {document_set_name}. Current status: {pipeline_obj.current_step or pipeline_obj.status}',
                    'status': pipeline_obj.status,
                    'progress': pipeline_obj.progress_percentage,
                    'current_step': pipeline_obj.current_step
                }, status=400)
                
        except (DocumentSet.DoesNotExist, ProcessingPipeline.DoesNotExist):
            pass  # Will be handled by rag_manager
        
        success = rag_manager.start_pipeline_processing(document_set_name, force_rebuild)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'Pipeline started for {document_set_name}'
            })
        else:
            return JsonResponse({
                'error': 'Failed to start pipeline. It may already be running or completed.'
            }, status=400)
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in start_pipeline: {e}")
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)
    except Exception as e:
        logger.error(f"Error starting pipeline: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def pipeline_status(request, document_set_name):
    """Get the current status of the RAG pipeline for a document set"""
    try:
        status_data = rag_manager.get_pipeline_status(document_set_name)
        return JsonResponse(status_data)
        
    except Exception as e:
        logger.error(f"Error getting pipeline status: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def list_document_sets(request):
    """List all available document sets"""
    try:
        user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        document_sets = rag_manager.list_document_sets(user)
        
        return JsonResponse({
            'document_sets': document_sets
        })
        
    except Exception as e:
        logger.error(f"Error listing document sets: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def rag_chat(request):
    """Enhanced chat endpoint using advanced RAG"""
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            query = body.get("query", "")
            conversation_id = body.get("conversation_id")
            document_set = body.get("document_set", "default")
            use_advanced_rag = body.get("use_advanced_rag", True)
            
            if not query:
                return JsonResponse({"error": "No query provided"}, status=400)

            # Create or get conversation
            if not conversation_id:
                conversation = Conversation.objects.create(
                    title=generate_title(query)
                )
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
                """Stream tokens from the advanced RAG system or fallback to basic system"""
                try:
                    if use_advanced_rag:
                        # Use advanced RAG system
                        response_content = ""
                        token_count = 0
                        for token_data in rag_manager.query_documents(document_set, query):
                            if "error" in token_data:
                                logger.error(f"RAG error: {token_data['error']}")
                                yield f"data: {json.dumps(token_data)}\n\n"
                                return
                            
                            if "answer" in token_data:
                                response_content += token_data["answer"]
                                token_count += 1
                                yield f"data: {json.dumps(token_data)}\n\n"
                            
                            if "completion" in token_data:
                                logger.info(f"RAG streaming completed - Tokens: {token_count}, Length: {len(response_content)}")
                                yield f"data: {json.dumps(token_data)}\n\n"
                        
                        # Save assistant message
                        if response_content:
                            Message.objects.create(
                                conversation=conversation,
                                role='assistant',
                                content=response_content
                            )
                            logger.info(f"Saved assistant message - Length: {len(response_content)}")
                    else:
                        # Fallback to general chat (no RAG)
                        response_content = ""
                        for token_data in general_chat_query(query):
                            if "answer" in token_data:
                                response_content += token_data["answer"]
                                yield f"data: {json.dumps(token_data)}\n\n"
                        
                        # Save assistant message
                        if response_content:
                            Message.objects.create(
                                conversation=conversation,
                                role='assistant',
                                content=response_content
                            )
                            
                    # Send conversation ID
                    yield f"data: {json.dumps({'conversation_id': str(conversation.id)})}\n\n"
                    
                except Exception as e:
                    logger.error(f"Error during streaming: {e}")
                    yield f"data: {json.dumps({'error': 'An error occurred during processing'})}\n\n"

            return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return JsonResponse({"error": "An error occurred while processing the query"}, status=500)

    return render(request, 'djangoapp/index.html')

@csrf_exempt
def document_sets_management(request):
    """Manage document sets - create, update, delete"""
    if request.method == 'GET':
        return list_document_sets(request)
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description', '')
            
            if not name:
                return JsonResponse({'error': 'Name is required'}, status=400)
            
            document_set, created = DocumentSet.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            
            if created:
                # Create processing pipeline
                ProcessingPipeline.objects.create(
                    document_set=document_set,
                    status='idle'
                )
                
                return JsonResponse({
                    'success': True,
                    'message': f'Document set "{name}" created successfully',
                    'document_set': {
                        'name': document_set.name,
                        'description': document_set.description,
                        'created_at': document_set.created_at
                    }
                })
            else:
                return JsonResponse({
                    'error': f'Document set "{name}" already exists'
                }, status=400)
                
        except Exception as e:
            logger.error(f"Error creating document set: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def document_list(request, document_set_name):
    """List documents in a specific document set"""
    try:
        document_set = DocumentSet.objects.get(name=document_set_name)
        documents = Document.objects.filter(document_set=document_set)
        
        document_list = []
        for doc in documents:
            document_list.append({
                'id': doc.id,
                'title': doc.title,
                'status': doc.status,
                'file_size': doc.file_size,
                'file_type': doc.file_type,
                'uploaded_at': doc.uploaded_at,
                'processed_at': doc.processed_at,
                'pages_count': doc.pages_count,
                'tables_count': doc.tables_count,
                'pictures_count': doc.pictures_count,
                'error_message': doc.error_message
            })
        
        return JsonResponse({
            'document_set': document_set_name,
            'documents': document_list
        })
        
    except DocumentSet.DoesNotExist:
        return JsonResponse({'error': 'Document set not found'}, status=404)
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def rag_system_status(request):
    """Get overall RAG system status"""
    try:
        # Get system-wide statistics
        total_document_sets = DocumentSet.objects.filter(is_active=True).count()
        total_documents = Document.objects.count()
        indexed_documents = Document.objects.filter(status='indexed').count()
        failed_documents = Document.objects.filter(status='failed').count()
        
        active_pipelines = ProcessingPipeline.objects.exclude(
            status__in=['idle', 'completed', 'failed']
        ).count()
        
        return JsonResponse({
            'total_document_sets': total_document_sets,
            'total_documents': total_documents,
            'indexed_documents': indexed_documents,
            'failed_documents': failed_documents,
            'active_pipelines': active_pipelines,
            'processing_percentage': (indexed_documents / total_documents * 100) if total_documents > 0 else 0
        })
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@csrf_exempt
def rebuild_document_set(request, document_set_name):
    """Rebuild a document set by clearing vector databases, Django records, and re-indexing"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.body else {}
            clear_parsed = data.get('clear_parsed', True)  # Default to true for complete rebuild
            clear_database = data.get('clear_database', True)  # Default to true for complete rebuild
            
            logger.info(f"Complete rebuild request for document set: {document_set_name}, clear_parsed: {clear_parsed}, clear_database: {clear_database}")
            
            # Start complete rebuild process
            success = rag_manager.rebuild_document_set(document_set_name, clear_parsed, clear_database)
            
            if success:
                return JsonResponse({
                    'message': f'Complete rebuild started for document set: {document_set_name}',
                    'clear_parsed': clear_parsed,
                    'clear_database': clear_database,
                    'description': 'This will clear all vector databases, Django records, and re-process all documents from scratch.'
                })
            else:
                return JsonResponse({
                    'error': 'Failed to start rebuild. Pipeline may be currently running or document set not found.'
                }, status=400)
                
        except Exception as e:
            logger.error(f"Error in rebuild endpoint: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def rag_clear_logs(request):
    """Clear processing logs"""
    if request.method == 'POST':
        try:
            # Clear logs from the rag_manager
            rag_manager.clear_logs()
            
            # Also clear any Django log records if you have a logging model
            # LogEntry.objects.all().delete()  # Uncomment if you have a log model
            
            logger.info("Processing logs cleared by admin action")
            return JsonResponse({
                'message': 'Processing logs cleared successfully'
            })
            
        except Exception as e:
            logger.error(f"Error clearing logs: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def rag_restart_stuck_pipelines(request):
    """Restart stuck pipelines"""
    if request.method == 'POST':
        try:
            # Find pipelines that have been running for too long
            from django.utils import timezone
            from datetime import timedelta
            
            # Consider pipelines stuck if they've been running for more than 30 minutes
            stuck_threshold = timezone.now() - timedelta(minutes=30)
            
            stuck_pipelines = ProcessingPipeline.objects.filter(
                status__in=['parsing', 'indexing', 'processing'],
                started_at__lt=stuck_threshold
            )
            
            restarted_count = 0
            for pipeline in stuck_pipelines:
                try:
                    # Force reset this pipeline
                    rag_manager.force_reset_pipeline(pipeline.document_set.name)
                    restarted_count += 1
                    logger.info(f"Restarted stuck pipeline for document set: {pipeline.document_set.name}")
                except Exception as e:
                    logger.error(f"Failed to restart pipeline for {pipeline.document_set.name}: {e}")
            
            return JsonResponse({
                'message': f'Restarted {restarted_count} stuck pipelines',
                'restarted_count': restarted_count
            })
            
        except Exception as e:
            logger.error(f"Error restarting stuck pipelines: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def rag_force_cleanup(request):
    """Force cleanup of all processing artifacts"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body) if request.body else {}
            confirm = data.get('confirm', False)
            
            if not confirm:
                return JsonResponse({
                    'error': 'This is a destructive operation. Please set confirm=true to proceed.'
                }, status=400)
            
            # Force cleanup all processing artifacts
            cleanup_results = rag_manager.force_cleanup_all()
            
            logger.warning("Force cleanup of all processing artifacts performed by admin action")
            
            return JsonResponse({
                'message': 'Force cleanup completed',
                'cleanup_results': cleanup_results
            })
            
        except Exception as e:
            logger.error(f"Error during force cleanup: {e}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def supported_models(request):
    """Get list of supported models for general chat."""
    try:
        from .logic import SUPPORTED_MODELS, DEFAULT_MODELS
        
        return JsonResponse({
            'supported_models': SUPPORTED_MODELS,
            'default_models': DEFAULT_MODELS,
            'providers': list(SUPPORTED_MODELS.keys())
        })
        
    except Exception as e:
        logger.error(f"Error getting supported models: {e}")
        return JsonResponse({'error': str(e)}, status=500)












