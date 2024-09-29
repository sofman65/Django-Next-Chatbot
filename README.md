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
