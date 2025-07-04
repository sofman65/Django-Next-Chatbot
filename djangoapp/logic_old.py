import time
import logging
import os
from dotenv import load_dotenv
from pathlib import Path
from huggingface_hub import InferenceClient
from openai import OpenAI

load_dotenv()

logger = logging.getLogger(__name__)

# Environment variables
HF_API_KEY = os.getenv('HF_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize clients
hf_client = InferenceClient(token=HF_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Note: ChromaDB removed - using separate RAG pipeline with Docling and FAISS


def database_exists():
    """Placeholder - ChromaDB not used."""
    return False


def build_database():
    """Placeholder - ChromaDB not used."""
    logger.info("ChromaDB not used - using advanced RAG pipeline with Docling and FAISS.")
    pass


def get_hf_client_for_model(model):
    """Get the appropriate HF client based on the model."""
    # For now, use the standard HF client for all models
    # TODO: Add support for specific providers when needed
    return hf_client

# Simple chit-chat detector: checks for small-talk keywords or patterns.
def is_smalltalk(query: str) -> bool:
    """
    A naive approach to detect small talk or general greetings/questions
    that don't require domain-specific context.
    """
    # You could expand this list or do more advanced classification.
    # For demonstration, we include "purpose", "who are you", "how are you", etc.
    smalltalk_keywords = [
        "purpose", 
        "who are you", 
        "how are you", 
        "what is your name", 
        "hello",
        "hi ",
        "greetings"
    ]
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in smalltalk_keywords)


def answer_query(query, model="gpt2", provider="huggingface"):
    """
    1) Check if query is 'chit-chat'.
       - If yes, return fallback persona-based response.
    2) Otherwise, retrieve context docs from Chroma (score_threshold).
    3) Create initial prompt & generate an initial answer (non-stream).
    4) Refine that draft with a second pass (streamed).
    """
    logger.info(f"Answer query called with model: {model}, provider: {provider}")

    # --- 1) Chit-Chat Fallback ---
    if is_smalltalk(query):
        # If we detect smalltalk, skip retrieval & yield a persona response.
        yield {
            "answer": (
                "I am Nexi Group’s AI assistant, here to assist with questions "
                "about our services, products, and more."
            )
        }
        return

    # --- 2) Retrieve context from ChromaDB --- TO DO: Replace with Faiss that exists in the system
    # Initialize the database connection
    # Ensure the database is built or exists    

    # For now, use no context for general queries
    context = "No specific documents provided."

    # db = get_db()
    # retriever = db.as_retriever(search_kwargs={"k": 14})
    # relevant_docs = retriever.invoke(query)

    # if not relevant_docs:
    #     logger.warning(f"No documents found for query '{query}'")
    #     yield {"answer": "No relevant information found in the provided documents."}
    #     return

    # # Build context string
    # context = "\n".join(
    #     [
    #         f"- Source: {doc.metadata.get('source', 'Unknown')} | {doc.page_content[:300]}"
    #         for doc in sorted(relevant_docs, key=lambda x: getattr(x, 'score', 0), reverse=True)
    #     ]
    # )

    # --- 3) Create the initial prompt & generate a non-streamed draft ---
    if provider == "huggingface":
        base_prompt = mistral_prompt_template.format(context=context, question=query)
    elif provider == "openai":
        base_prompt = openai_prompt_template.format(context=context, question=query)
    else:
        logger.error(f"Invalid provider specified: {provider}")
        yield {"answer": "Error: Invalid provider specified."}
        return

    initial_draft = run_llm_sync(base_prompt, model, provider)
    logger.debug(f"Initial draft answer: {initial_draft}")

    # --- 4) Refine prompt & yield a streamed final answer ---
    refine_prompt_str = refine_prompt_template.format(
        draft_answer=initial_draft,
        context=context
    )
    yield from run_llm_stream(refine_prompt_str, model, provider)


def run_llm_sync(prompt, model, provider):
    """Call the LLM synchronously for the initial draft."""
    if provider == "huggingface":
        return huggingface_sync_inference(prompt, model)
    elif provider == "openai":
        return openai_sync_inference(prompt, model)
    else:
        return "Error: Invalid provider"


def huggingface_sync_inference(prompt, model):
    """Non-stream call to HF model for an entire response."""
    try:
        response = hf_client.text_generation(
            prompt=prompt,
            model=model,
            max_new_tokens=200,
            temperature=0.7,
            return_full_text=False
        )
        return response.strip() if response else ""
    except Exception as e:
        logger.error(f"Error in huggingface_sync_inference: {e}")
        return "An error occurred while processing the query."


def openai_sync_inference(prompt, model):
    """Non-stream call to OpenAI model for an entire response."""
    try:
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7,
            stream=False
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error in openai_sync_inference: {e}")
        return "An error occurred while processing the query."


def run_llm_stream(prompt, model, provider):
    """Stream the final (refined) answer."""
    if provider == "huggingface":
        yield from mistral_stream_inference(prompt, model)
    elif provider == "openai":
        yield from openai_stream_inference(prompt, model)
    else:
        yield {"answer": "Error: Invalid provider"}


def mistral_stream_inference(prompt, model, temperature=0.7):
    """Streaming pass with Hugging Face for refined answer."""
    try:
        response = hf_client.text_generation(
            prompt=prompt,
            model=model,
            max_new_tokens=150,
            temperature=temperature,
            return_full_text=False,
            stream=True
        )

        for response_chunk in response:
            # Handle different response formats from HF streaming
            if hasattr(response_chunk, 'token') and hasattr(response_chunk.token, 'text'):
                token_text = response_chunk.token.text
            elif isinstance(response_chunk, str):
                token_text = response_chunk
            else:
                token_text = str(response_chunk)
            
            if token_text:
                yield {"answer": token_text}

    except Exception as e:
        logger.error(f"Error during Mistral streaming: {e}")
        yield {"answer": "An error occurred while processing the refined query."}


def openai_stream_inference(prompt, model, temperature=0.7):
    """Streaming pass with OpenAI for refined answer."""
    try:
        logger.info(f"Calling OpenAI API with model: {model} for refined answer")
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=temperature,
            stream=True
        )

        accumulated_text = ""
        for chunk in response:
            content_part = chunk.choices[0].delta.content if chunk.choices[0].delta.content else ""
            accumulated_text += content_part

            if content_part.endswith("."):
                yield {"answer": accumulated_text.strip()}
                accumulated_text = ""

        if accumulated_text:
            yield {"answer": accumulated_text.strip()}

    except Exception as e:
        logger.error(f"Error during OpenAI streaming: {e}")
        yield {"answer": "An error occurred while processing the refined query."}


def generate_title(query):
    """Generate a title for a new conversation based on the first query."""
    try:
        prompt = f"Generate a short title (max 6 words) for a conversation that starts with this query: {query}"
        response = hf_client.text_generation(
            prompt=prompt,
            model="gpt2",
            max_new_tokens=20,
            return_full_text=False
        )
        title = response.strip() if response else ""
        return title[:255] if title else f"Chat about {query[:30]}..."
    except Exception as e:
        logger.error(f"Error generating title: {e}")
        return f"Chat about {query[:30]}..."

def general_chat_query(query, model="gpt2", provider="huggingface"):
    """
    General AI assistant chat - no document retrieval, no references.
    Acts like a standard AI assistant without ChromaDB lookup.
    """
    logger.info(f"General chat query called with model: {model}, provider: {provider}")

    # Create a simple AI assistant prompt without document context
    if provider == "huggingface":
        prompt = f"""You are Nexi Group's AI assistant. You are helpful, knowledgeable, and professional. 
Respond naturally to the user's question without referencing any specific documents.

User: {query}
Assistant:"""
    elif provider == "openai":
        prompt = f"""You are Nexi Group's AI assistant. You are helpful, knowledgeable, and professional. 
Respond naturally to the user's question without referencing any specific documents.

User: {query}
Assistant:"""
    else:
        logger.error(f"Invalid provider specified: {provider}")
        yield {"answer": "Error: Invalid provider specified."}
        return

    # Stream the response directly without RAG pipeline
    yield from run_llm_stream(prompt, model, provider)