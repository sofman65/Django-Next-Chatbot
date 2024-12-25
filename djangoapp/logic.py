from dotenv import load_dotenv
from pathlib import Path
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader
from langchain_chroma import Chroma
from langchain.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from huggingface_hub import InferenceClient  
import os
import logging

# Configure logger
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Directory where the Chroma database will be stored
CHROMA_DB_DIRECTORY = "chroma_db/company_docs"

# Hugging Face API details for Mistral-7B
HF_API_KEY = os.getenv('HF_API_KEY')
client = InferenceClient(token=HF_API_KEY)

# Initialize embeddings
model_name = "sentence-transformers/all-mpnet-base-v2"
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
    
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=500,  # Smaller chunks to capture details
        chunk_overlap=100  # Overlap to maintain context
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

def answer_query(query):
    """Answer a user query using the Chroma database and LLM."""
    db = get_db()
    retriever = db.as_retriever(search_kwargs={"k": 3})
    relevant_docs = retriever.invoke(query)

    if relevant_docs:
        logger.info(f"Found {len(relevant_docs)} relevant documents for query '{query}'")
    else:
        logger.warning(f"No documents found for query '{query}'")
        yield {"answer": "No relevant information found in the provided documents."}
        return

    context = "\n".join([doc.page_content[:300] for doc in relevant_docs])

    prompt_template = """
        You are given the following context, which contains information relevant to the user's query.

        Context: {context}

        Based on the context, answer the following question clearly and concisely:

        Question: {question}

        If the context does not contain the required information, return: "No relevant information found in the provided documents."

        Answer:
        """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    formatted_prompt = prompt.format(context=context, question=query)

    messages = [{"role": "user", "content": formatted_prompt}]
    response = client.chat_completion(messages=messages, model="mistralai/Mistral-7B-Instruct-v0.3", max_tokens=150, stream=True)

    previous_token = None
    try:
        for chunk in response:
            token = chunk.choices[0].delta.content
            if token and token != previous_token:
                yield {"answer": token}
                previous_token = token
    except Exception as e:
        logger.error(f"Error during LLM response: {e}")
        yield {"answer": "An error occurred while processing the query."}
        return
