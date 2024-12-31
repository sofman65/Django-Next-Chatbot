from dotenv import load_dotenv
from pathlib import Path
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader
from langchain_chroma import Chroma
from langchain.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient
from openai import OpenAI
import os
import logging

load_dotenv()
# Load environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Initialize the OpenAI client with the API key
openai_client = OpenAI(api_key=OPENAI_API_KEY)


# Configure logger
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Directory where the Chroma database will be stored
CHROMA_DB_DIRECTORY = "chroma_db/company_docs"

# API Keys
HF_API_KEY = os.getenv('HF_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Hugging Face Client
hf_client = InferenceClient(token=HF_API_KEY)



# Initialize embeddings
model_name = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
model_kwargs = {"device": "cpu"}
embeddings = HuggingFaceEmbeddings(model_name=model_name, model_kwargs=model_kwargs)

# Global database object for reuse
db = None

def get_db():
    """Get or initialize the Chroma database."""
    global db
    if db is None:
        db = Chroma(
            collection_name="company_docs",
            embedding_function=embeddings,
            persist_directory=CHROMA_DB_DIRECTORY
        )
    return db

def database_exists():
    """Check if the Chroma database directory exists."""
    return os.path.exists(CHROMA_DB_DIRECTORY)

def build_database():
    """Build the Chroma database by loading documents and creating embeddings."""
    loader = DirectoryLoader(
        '/Users/lsofianos/Downloads/PWC-Docs',  # Replace this with the path to your local docs
        glob="**/*.*",  # Matches all files
        recursive=True  # Recursively search through subdirectories
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} documents.")

    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=500,  # Smaller chunks to capture details
        chunk_overlap=50  # Overlap to maintain context
    )
    splits = splitter.split_documents(documents)

    db = Chroma.from_documents(
        splits,
        embeddings,
        collection_name="company_docs",
        persist_directory=CHROMA_DB_DIRECTORY
    )
    db.persist()
    logger.info("Database built and persisted successfully.")

def answer_query(query, model="mistralai/Mistral-7B-Instruct-v0.3", provider="huggingface"):
    logger.info(f"Answer query called with model: {model}, provider: {provider}")
    db = get_db()
    retriever = db.as_retriever(search_kwargs={"k": 5})
    relevant_docs = retriever.invoke(query)

    # Manually filter by score if it exists
    score_threshold = 0.2
    filtered_docs = [
        doc for doc in relevant_docs if hasattr(doc, 'score') and doc.score >= score_threshold
    ]



    # Prepare context for the LLM
    context = "\n".join(
        [f"- Source: {doc.metadata.get('source', 'Unknown')} | {doc.page_content[:300]}" 
         for doc in sorted(filtered_docs, key=lambda x: x.score, reverse=True)]
    )

    # Prompt template
    prompt_template = """
        You are an expert assistant of Nexi Group. Answer the following question using only the provided context. Do not use outside knowledge or guess.

        Context: {context}

        If the user asks questions about your functionality or identity, respond as follows:
        "I am Nexi Group's AI assistant, here to assist with questions about our services, products, and more."

        If the user asks questions about the company, respond as follows:
        "Nexi Group is a leading provider of financial services, offering a wide range of products and solutions to meet your financial needs."



        Question: {question}

        If the context is insufficient, say: "No relevant information found in the provided documents."

        ALWAYS ANSWER WITH THE LANGUAGE OF THE QUESTION.

        ALWAYS CITE YOUR SOURCES.

        ALWAYS RESPOND WHEN THE USER GIVES YOU A QUESTION.

        Answer:
        """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    formatted_prompt = prompt.format(context=context, question=query)

    # Ensure the correct response function is called
    if provider == "huggingface":
        logger.info("Routing to Hugging Face API")
        yield from mistral_response(formatted_prompt, model)
    elif provider == "openai":
        logger.info("Routing to OpenAI API")
        yield from openai_response(formatted_prompt, model)
    else:
        logger.error(f"Invalid provider specified: {provider}")
        yield {"answer": "An error occurred while processing the query. Invalid provider specified."}



def mistral_response(prompt, model):
    """Generate a response using a Hugging Face model."""
    try:
        messages = [{"role": "user", "content": prompt}]
        response = hf_client.chat_completion(messages=messages, model=model, max_tokens=150, stream=True)

        accumulated_text = ""
        previous_token = None
        for chunk in response:
            token = chunk.choices[0].delta.content
            if token and token != previous_token:
                accumulated_text += token
                if token.endswith("."):
                    yield {"answer": accumulated_text.strip()}
                    accumulated_text = ""
                previous_token = token
    except Exception as e:
        logger.error(f"Error during Mistral response: {e}")
        yield {"answer": "An error occurred while processing the query."}
        return


def openai_response(prompt, model):
    try:
        logger.info(f"Calling OpenAI API with model: {model}")
        response = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt }],
            stream=True
        )
        accumulated_text = ""

        for chunk in response:
            # chunk.choices -> list of ChatCompletionChunkChoice objects
            # chunk.choices[0].delta -> ChoiceDelta
            content_part = chunk.choices[0].delta.content if chunk.choices[0].delta.content else ""
            accumulated_text += content_part

            # If you want to yield partial sentences or tokens:
            if content_part.endswith("."):
                yield {"answer": accumulated_text.strip()}
                accumulated_text = ""

    except Exception as e:
        logger.error(f"Error during OpenAI response: {e}")
        yield {"answer": "An error occurred while processing the query."}




def generate_title(query):
    """Generate a title for a new conversation based on the first query."""
    messages = [{"role": "user", "content": f"Generate a short title (max 6 words) for a conversation that starts with this query: {query}"}]
    response = hf_client.chat_completion(
        messages=messages,
        model="mistralai/Mistral-7B-Instruct-v0.3",
        max_tokens=20,
        stream=False
    )
    title = response.choices[0].message.content.strip()
    return title[:255]  # Ensure it fits in the database field
