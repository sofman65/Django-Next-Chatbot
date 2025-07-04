import logging
import os
from dotenv import load_dotenv
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

# Supported models for general chat
SUPPORTED_MODELS = {
    "huggingface": [
        "mistralai/Mistral-7B-Instruct-v0.3",
        "meta-llama/Llama-2-7b-chat-hf"
    ],
    "openai": [
        "gpt-3.5-turbo",
        "gpt-4",
        "gpt-4-turbo"
    ]
}

# Default models per provider
DEFAULT_MODELS = {
    "huggingface": "mistralai/Mistral-7B-Instruct-v0.3",
    "openai": "gpt-3.5-turbo"
}


def database_exists():
    """Placeholder - ChromaDB not used for general chat."""
    return False


def build_database():
    """Placeholder - ChromaDB not used for general chat."""
    logger.info("ChromaDB not used - using advanced RAG pipeline with Docling and FAISS for RAG queries.")
    pass


def validate_model_and_provider(model, provider):
    """Validate that the model and provider combination is supported."""
    if provider not in SUPPORTED_MODELS:
        logger.error(f"Unsupported provider: {provider}")
        return False, f"Unsupported provider: {provider}. Supported providers: {list(SUPPORTED_MODELS.keys())}"
    
    if model not in SUPPORTED_MODELS[provider]:
        logger.error(f"Unsupported model {model} for provider {provider}")
        return False, f"Unsupported model {model} for provider {provider}. Supported models: {SUPPORTED_MODELS[provider]}"
    
    return True, None


def general_chat_query(query, model=None, provider="huggingface"):
    """
    General AI assistant chat - no document retrieval, no references.
    Acts like a standard AI assistant without ChromaDB lookup.
    """
    # Use default model if none specified
    if not model:
        model = DEFAULT_MODELS.get(provider, DEFAULT_MODELS["huggingface"])
    
    logger.info(f"General chat query called with model: {model}, provider: {provider}")

    # Validate model and provider
    is_valid, error_msg = validate_model_and_provider(model, provider)
    if not is_valid:
        yield {"answer": f"Error: {error_msg}"}
        return

    # Create a simple AI assistant prompt without document context
    system_message = "You are Nexi Group's AI assistant. You are helpful, knowledgeable, and professional. Respond naturally to the user's question."
    
    try:
        if provider == "huggingface":
            # Format prompt for Hugging Face models (especially Mistral and Llama)
            if "mistral" in model.lower():
                prompt = f"<s>[INST] {system_message}\n\nUser: {query} [/INST]"
            elif "llama" in model.lower():
                prompt = f"<s>[INST] <<SYS>>\n{system_message}\n<</SYS>>\n\n{query} [/INST]"
            else:
                prompt = f"{system_message}\n\nUser: {query}\nAssistant:"
            
            yield from stream_huggingface_response(prompt, model)
            
        elif provider == "openai":
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ]
            yield from stream_openai_response(messages, model)
            
        else:
            logger.error(f"Invalid provider specified: {provider}")
            yield {"answer": "Error: Invalid provider specified."}
            
    except Exception as e:
        logger.error(f"Error in general_chat_query: {e}")
        yield {"answer": "An error occurred while processing your request."}


def stream_huggingface_response(prompt, model, temperature=0.7, max_new_tokens=512):
    """Stream response from Hugging Face models."""
    try:
        logger.info(f"Streaming from Hugging Face model: {model}")
        
        response = hf_client.text_generation(
            prompt=prompt,
            model=model,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            return_full_text=False,
            stream=True
        )

        for chunk in response:
            # Handle different response formats from HF streaming
            if hasattr(chunk, 'token') and hasattr(chunk.token, 'text'):
                token_text = chunk.token.text
            elif isinstance(chunk, str):
                token_text = chunk
            elif hasattr(chunk, 'generated_text'):
                token_text = chunk.generated_text
            else:
                token_text = str(chunk)
            
            if token_text:
                yield {"answer": token_text}

    except Exception as e:
        logger.error(f"Error during Hugging Face streaming: {e}")
        yield {"answer": "An error occurred while processing your request."}


def stream_openai_response(messages, model, temperature=0.7, max_tokens=512):
    """Stream response from OpenAI models."""
    try:
        logger.info(f"Streaming from OpenAI model: {model}")
        
        response = openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True
        )

        for chunk in response:
            if chunk.choices[0].delta.content:
                yield {"answer": chunk.choices[0].delta.content}

    except Exception as e:
        logger.error(f"Error during OpenAI streaming: {e}")
        yield {"answer": "An error occurred while processing your request."}


def generate_title(query, model=None, provider="huggingface"):
    """
    Generate a title for a new conversation based on the first query.
    Uses Mistral by default for title generation.
    """
    # Use Mistral by default for title generation
    if not model:
        model = "mistralai/Mistral-7B-Instruct-v0.3"
        provider = "huggingface"
    
    try:
        logger.info(f"Generating title with model: {model}, provider: {provider}")
        
        # Validate model and provider
        is_valid, error_msg = validate_model_and_provider(model, provider)
        if not is_valid:
            logger.warning(f"Title generation failed: {error_msg}. Using fallback.")
            return f"Chat about {query[:30]}..."
        
        title_prompt = f"Generate a short, concise title (max 6 words) for a conversation that starts with this query: {query}\n\nTitle:"
        
        if provider == "huggingface":
            if "mistral" in model.lower():
                formatted_prompt = f"<s>[INST] {title_prompt} [/INST]"
            else:
                formatted_prompt = title_prompt
                
            response = hf_client.text_generation(
                prompt=formatted_prompt,
                model=model,
                max_new_tokens=20,
                temperature=0.5,
                return_full_text=False,
                stream=False
            )
            title = response.strip() if response else ""
            
        elif provider == "openai":
            response = openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": title_prompt}],
                max_tokens=20,
                temperature=0.5,
                stream=False
            )
            title = response.choices[0].message.content.strip()
        else:
            title = ""
        
        # Clean up the title and ensure it's reasonable
        if title:
            # Remove quotes and clean up
            title = title.strip('"\'').strip()
            # Limit length
            title = title[:50] if len(title) > 50 else title
            return title
        else:
            return f"Chat about {query[:30]}..."
            
    except Exception as e:
        logger.error(f"Error generating title: {e}")
        return f"Chat about {query[:30]}..."


# Legacy function for backward compatibility - redirects to general_chat_query
def answer_query(query, model=None, provider="huggingface"):
    """
    Legacy function for backward compatibility.
    Redirects to general_chat_query for general chat without retrieval.
    """
    logger.info("answer_query called - redirecting to general_chat_query")
    yield from general_chat_query(query, model, provider)
