import logging
import os
import requests
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

# Hugging Face API endpoint
HF_API_URL = "https://api-inference.huggingface.co/models/"

# Supported models for general chat
SUPPORTED_MODELS = {
    "huggingface": [
        "mistralai/Mistral-7B-Instruct-v0.1", 
        "mistralai/Mistral-7B-Instruct-v0.3",  # Both versions supported
        "microsoft/DialoGPT-medium",
        "HuggingFaceH4/zephyr-7b-beta",
        "gpt2",  # Fallback model that should always work
        "google/flan-t5-large"  # Another reliable fallback
    ],
    "openai": [
        "gpt-3.5-turbo",
        "gpt-4",
        "gpt-4-turbo"
    ]
}

# Default models per provider  
DEFAULT_MODELS = {
    "huggingface": "gpt2",  # Fallback for HF
    "openai": "gpt-3.5-turbo"  # Primary recommendation
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


def general_chat_query(query, model=None, provider="openai"):
    """
    General AI assistant chat - no document retrieval, no references.
    Acts like a standard AI assistant without ChromaDB lookup.
    Default to OpenAI since it's more reliable.
    """
    # Use default model if none specified
    if not model:
        model = DEFAULT_MODELS.get(provider, DEFAULT_MODELS["openai"])
    
    logger.info(f"General chat query called with model: {model}, provider: {provider}")

    # Validate model and provider
    is_valid, error_msg = validate_model_and_provider(model, provider)
    if not is_valid:
        # If validation fails, try OpenAI as fallback
        if provider != "openai":
            logger.warning(f"Falling back to OpenAI due to validation error: {error_msg}")
            return general_chat_query(query, model="gpt-3.5-turbo", provider="openai")
        else:
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
        # Try OpenAI as final fallback if not already using it
        if provider != "openai":
            logger.info("Attempting OpenAI fallback...")
            yield from general_chat_query(query, model="gpt-3.5-turbo", provider="openai")
        else:
            yield {"answer": "An error occurred while processing your request."}


def call_hf_api_direct(model, prompt, max_new_tokens=512, temperature=0.7, stream=False):
    """Call Hugging Face API directly using requests."""
    try:
        url = f"{HF_API_URL}{model}"
        headers = {
            "Authorization": f"Bearer {HF_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_new_tokens,
                "temperature": temperature,
                "return_full_text": False,
                "do_sample": True
            },
            "options": {
                "wait_for_model": True,
                "use_cache": False
            }
        }
        
        if stream:
            payload["stream"] = True
            
        response = requests.post(url, headers=headers, json=payload, stream=stream)
        response.raise_for_status()
        
        if stream:
            for line in response.iter_lines():
                if line:
                    try:
                        import json
                        data = json.loads(line.decode('utf-8'))
                        if 'token' in data and 'text' in data['token']:
                            yield data['token']['text']
                        elif 'generated_text' in data:
                            yield data['generated_text']
                    except json.JSONDecodeError:
                        continue
        else:
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                return result[0].get('generated_text', '')
            elif isinstance(result, dict):
                return result.get('generated_text', '')
            return str(result)
            
    except Exception as e:
        logger.error(f"Direct HF API call failed for {model}: {e}")
        return None


def stream_huggingface_response(prompt, model, temperature=0.7, max_new_tokens=512):
    """Stream response from Hugging Face models with robust fallback."""
    logger.info(f"Streaming from Hugging Face model: {model}")
    
    # Define a list of models to try in order of preference
    models_to_try = [model]
    
    # Add fallback models if they're not already in the list
    fallback_models = ["gpt2", "microsoft/DialoGPT-medium", "google/flan-t5-small"]
    for fallback in fallback_models:
        if fallback not in models_to_try:
            models_to_try.append(fallback)
    
    for try_model in models_to_try:
        try:
            logger.info(f"Attempting to use model: {try_model}")
            
            # Adjust prompt format based on model
            if "mistral" in try_model.lower():
                formatted_prompt = f"<s>[INST] {prompt} [/INST]"
            elif "flan" in try_model.lower():
                formatted_prompt = f"Answer this question: {prompt}"
            else:
                formatted_prompt = prompt
            
            # Try the direct API call first
            response_generated = False
            try:
                for token in call_hf_api_direct(try_model, formatted_prompt, max_new_tokens, temperature, stream=True):
                    if token:
                        response_generated = True
                        yield {"answer": token}
                
                if response_generated:
                    logger.info(f"Successfully generated response with model: {try_model}")
                    return
            except:
                # Fall back to the original InferenceClient method
                response = hf_client.text_generation(
                    prompt=formatted_prompt,
                    model=try_model,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    return_full_text=False,
                    stream=True
                )

                for chunk in response:
                    response_generated = True
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
                
                if response_generated:
                    logger.info(f"Successfully generated response with model: {try_model}")
                    return
                    
        except Exception as model_error:
            logger.warning(f"Model {try_model} failed: {model_error}")
            continue
    
    # If all models fail, provide a helpful response
    logger.error("All Hugging Face models failed")
    yield {"answer": "I'm experiencing technical difficulties with the AI models. Please try again in a moment, or try using OpenAI models instead."}


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


def generate_title(query, model=None, provider="openai"):
    """
    Generate a title for a new conversation based on the first query.
    Uses OpenAI by default since it's more reliable.
    """
    try:
        logger.info(f"Generating title for query: {query[:50]}...")
        
        title_prompt = f"Generate a short, concise title (max 6 words) for a conversation that starts with this query: {query}\n\nTitle:"
        
        if provider == "openai":
            try:
                response = openai_client.chat.completions.create(
                    model=model or "gpt-3.5-turbo",
                    messages=[{"role": "user", "content": title_prompt}],
                    max_tokens=15,
                    temperature=0.3,
                    stream=False
                )
                title = response.choices[0].message.content.strip()
                
                if title:
                    title = title.strip('"\'').strip()
                    title = title[:50] if len(title) > 50 else title
                    logger.info(f"Generated title with OpenAI: {title}")
                    return title
            except Exception as openai_error:
                logger.warning(f"OpenAI title generation failed: {openai_error}")
                
        elif provider == "huggingface":
            # Try multiple models with fallback, starting with most reliable
            models_to_try = ["gpt2", "google/flan-t5-small", "microsoft/DialoGPT-medium"]
            if model and model not in models_to_try:
                models_to_try.insert(0, model)  # Try requested model first
            
            for try_model in models_to_try:
                try:
                    logger.info(f"Trying title generation with model: {try_model}")
                    
                    if "mistral" in try_model.lower():
                        formatted_prompt = f"<s>[INST] {title_prompt} [/INST]"
                    elif "flan" in try_model.lower():
                        formatted_prompt = f"Generate a title: {query}\nTitle:"
                    else:
                        formatted_prompt = title_prompt
                    
                    # Try direct API call first
                    response = call_hf_api_direct(try_model, formatted_prompt, max_new_tokens=15, temperature=0.3, stream=False)
                    
                    if not response:
                        # Fall back to InferenceClient
                        response = hf_client.text_generation(
                            prompt=formatted_prompt,
                            model=try_model,
                            max_new_tokens=15,
                            temperature=0.3,
                            return_full_text=False,
                            stream=False
                        )
                    
                    if response and response.strip():
                        title = response.strip()
                        # Clean up the title and ensure it's reasonable
                        title = title.strip('"\'').strip()
                        title = title[:50] if len(title) > 50 else title
                        logger.info(f"Generated title with {try_model}: {title}")
                        return title
                        
                except Exception as model_error:
                    logger.warning(f"Title generation failed with {try_model}: {model_error}")
                    continue
        
        # Fallback if all methods fail
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
