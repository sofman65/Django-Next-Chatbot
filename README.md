# Django-Next-Chatbot

## Description

This project is a chatbot application built using **Django** on the backend and **Next.js** on the frontend. The chatbot integrates with a **Retrieval-Augmented Generation (RAG)** approach for answering queries based on a document database. It streams responses using **Hugging Face's** models via their API and provides real-time responses in a conversational UI.

## Features

- **Full-stack architecture** using Django (backend) and Next.js (frontend)
- **Real-time streaming responses** for a conversational experience
- **Retrieval-Augmented Generation (RAG)**: The chatbot pulls information from documents stored in a local database and integrates with a language model to provide concise answers.
- **Document embedding** and **Chroma** vector database for storing and retrieving document knowledge
- **Frontend** includes a modern chat interface built with Next.js and Tailwind CSS
- **Backend** includes streaming HTTP responses using **Server-Sent Events (SSE)** for real-time updates

## Tech Stack

- **Backend**: Django, Python, Hugging Face API, Chroma
- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: Chroma (for document embeddings)
- **Language Model**: Hugging Face models (e.g., Mistral, etc.)

## Setup Instructions

### Prerequisites

- **Python 3.12+** and pip
- **Node.js 18+** and npm (for Next.js)
- **Git**
- A **Hugging Face** API key

### Backend Setup (Django)

1. Clone the repository:
   ```bash
   git clone https://github.com/sofman65/Django-Next-Chatbot.git
   cd Django-Next-Chatbot

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the `djangoapp` directory with the following:
   ```bash
   HF_API_KEY=<your_hugging_face_api_key>
   ```

4. Run the Django development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup (Next.js)

1. Navigate to the `nextjs-chatbot` directory:

   ```bash
   cd nextjs-chatbot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `nextjs-chatbot` directory with the following:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=<your_django_backend_url>
   ```

4. Run the Next.js development server:
   ```bash
   npm run dev
   ```

## Building the Database

1. Navigate to the `djangoapp` directory:

   ```bash
    curl -X GET http://127.0.0.1:8000/build_db/
   ```

## How it works


## Backend

The backend manages the document embeddings and the language model integration. It uses Hugging Face's API to interact with large language models and Chroma for managing and retrieving document embeddings.
Upon receiving a query, the backend retrieves relevant documents from the Chroma database and streams the language model's response back to the frontend using Server-Sent Events (SSE).

## Frontend

The frontend consists of a sleek chat interface built with React and Tailwind CSS. Users can interact with the chatbot in real-time and receive streamed responses for a more interactive experience.

Feel free to submit issues, fork the repository, and send pull requests. Contributions and improvements are welcome!