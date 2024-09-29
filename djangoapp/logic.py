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
model_id = "mistralai/Mistral-7B-Instruct-v0.3"

# Initialize the Hugging Face Inference Client
client = InferenceClient(token=HF_API_KEY)

# Check if the Chroma database already exists
def database_exists():
    return os.path.exists(CHROMA_DB_DIRECTORY)

def build_database():
    # Load documents from the local 'company_docs' directory
    loader = DirectoryLoader(
        '/Users/lsofianos/Downloads/PWC-Docs',  # Replace this with the path to your local docs
        glob="**/*.*",  # Matches all files (you can restrict it to specific types like **/*.pdf or **/*.txt)
        recursive=True  # Recursively search through subdirectories
    )

    # Load the documents from the directory
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
    chunk_size=500,  # Try a smaller chunk size to capture finer details
    chunk_overlap=100  # Overlap to maintain context across chunks
)

    # Split the documents into chunks
    splits = splitter.split_documents(documents)

    # Initialize embeddings
    model_name = "sentence-transformers/all-mpnet-base-v2"
    model_kwargs = {"device": "cpu"}
    embeddings = HuggingFaceEmbeddings(model_name=model_name, model_kwargs=model_kwargs)

    # Create Chroma database without persist
    db = Chroma.from_documents(
        splits,
        embeddings,
        collection_name="company_docs",
        persist_directory=CHROMA_DB_DIRECTORY
    )


def answer_query(query):
    # Get the vector representation for the user question
    model_name = "sentence-transformers/all-mpnet-base-v2"
    model_kwargs = {"device": "cpu"}
    embeddings = HuggingFaceEmbeddings(model_name=model_name, model_kwargs=model_kwargs)

    # Load the Chroma database
    db = Chroma(
        collection_name="company_docs",
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_DIRECTORY
    )

    # Retrieve relevant documents from Chroma database
    retriever = db.as_retriever()
    relevant_docs = retriever.invoke(query)

    if relevant_docs:
        logger.info(f"Found {len(relevant_docs)} relevant documents for query '{query}'")
        for doc in relevant_docs:
            logger.debug(f"Document content: {doc.page_content[:100]}")  # Log first 100 chars of each doc
    else:
        logger.warning(f"No documents found for query '{query}'")

    # Prepare the context from the retrieved documents
    context = "\n".join([doc.page_content for doc in relevant_docs])

    prompt_template = """
        You are given the following context, which contains information relevant to the user's query.

        Context: {context}

        Based on the context, answer the following question clearly and concisely:

        Question: {question}

        If the context does not contain the required information, return: "No relevant information found in the provided documents."

        Answer:
        """
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])

    # Format the final prompt
    formatted_prompt = prompt.format(context=context, question=query)

    # Send the prompt to the LLM (e.g., Mistral) model via Hugging Face Inference API
    messages = [{"role": "user", "content": formatted_prompt}]
    response = client.chat_completion(messages=messages, model="mistralai/Mistral-7B-Instruct-v0.3", max_tokens=150, stream=True)

    # Extract the response text from the response object
    generated_text = ""
    for chunk in response:
        token = chunk.choices[0].delta.content
        if token:
            generated_text += token
            yield {"answer": token}  # Stream each token as it arrives

    # Finally, yield the full answer and document sources
    yield {
        "answer": generated_text,
        "sources": [doc.metadata.get("source", "Unknown") for doc in relevant_docs]
    }
    


