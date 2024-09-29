from django.http import JsonResponse
from django.shortcuts import render
from .logic import answer_query, build_database, database_exists
import threading
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from django.http import StreamingHttpResponse
# Configure logger
logger = logging.getLogger(__name__)

@csrf_exempt
def index(request):
    """
    The main view that handles user queries and streams the chatbot's answer progressively.
    """
    if request.method == 'POST':
        try:
            # Extract the user's query from the POST data or request body
            query = request.POST.get('query')
            if not query:
                body = json.loads(request.body)
                logger.debug(f"Request body: {body}")
                query = body.get("query", "")

            # Handle missing query
            if not query:
                logger.warning("No query provided in the request.")
                return JsonResponse({"error": "No query provided"}, status=400)

            # Define a generator function to stream the tokens from the chatbot
            def event_stream():
                for token in answer_query(query):  # `stream_answer_query` is the generator in `logic.py`
                    yield f"data: {json.dumps(token)}\n\n"  # Streaming in Server-Sent Events (SSE) format

            # Return a streaming HTTP response
            response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
            return response

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        
        except Exception as e:
            # Catch and log any other exceptions
            logger.error(f"Error processing query: {e}")
            return JsonResponse({"error": "An error occurred while processing the query"}, status=500)

    # For non-POST requests, render the chat interface template.
    return render(request, 'djangoapp/index.html')

@csrf_exempt
def db_status(request):
    """
    A view to check the status of the database.

    Returns a JSON response indicating whether the database exists and is ready to be queried.
    """
    try:
        # Check if the database exists using the `database_exists` function from `logic.py`.
        exists = database_exists()
        # Prepare the status message based on the existence of the database.
        status = {
            'exists': exists,
            'message': 'Database exists' if exists else 'Database is being built'
        }
        logger.debug(f"Database status: {status}")
        return JsonResponse(status)
    
    except Exception as e:
        logger.error(f"Error checking database status: {e}")
        return JsonResponse({"error": "Error checking database status"}, status=500)

@csrf_exempt
def build_db(request):
    """
    A view to initiate the asynchronous building of the database.

    This view starts a new thread to build the database using the `build_database` function
    from `logic.py`, allowing the web server to continue handling other requests.
    """
    try:
        # Start a new thread to build the database asynchronously.
        thread = threading.Thread(target=build_database)
        thread.start()
        logger.info("Database building started in a new thread.")
        # Inform the requester that the database building process has started.
        return JsonResponse({'status': 'Building database...'})
    
    except Exception as e:
        logger.error(f"Error starting database build: {e}")
        return JsonResponse({"error": "Error starting database build"}, status=500)
