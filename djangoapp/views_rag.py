# djangoapp/views_rag.py
import json
from django.http import StreamingHttpResponse, JsonResponse
from .advanced_rag_logic import rag_manager

def rag_chat_by_set(request, document_set_name: str):
    """
    Handles RAG chat requests for a specific document set,
    streaming the response using Server-Sent Events (SSE).
    """
    q = request.GET.get("q")
    if not q:
        return JsonResponse({"error": "Missing required 'q' parameter"}, status=400)

    def event_stream():
        """Generator function to stream chunks from the RAG manager."""
        try:
            for chunk in rag_manager.query_documents(document_set_name, q, user=request.user):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            # Log the error and yield an error event if something goes wrong
            print(f"Error during event stream for {document_set_name}: {e}")
            error_chunk = {"error": "An error occurred while processing your request."}
            yield f"data: {json.dumps(error_chunk)}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["X-Accel-Buffering"] = "no"  # Disable buffering for Nginx
    response["Cache-Control"] = "no-cache" # Ensure no caching
    return response
