from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from .logic import answer_query, build_database, database_exists
import threading
from django.views.decorators.csrf import csrf_exempt
import json
import logging

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
