# 🐍 Python Multi-LLM RAG Backend (Chatbot Mythology)

A high-performance **FastAPI Retrieval-Augmented Generation (RAG) Backend** designed to power the Chatbot Mythology mobile and web applications. It maps modern user dilemmas to analogous narrative scenarios, character decisions, and philosophical principles from the **Ramayana** and **Mahabharata**.

---

## 🌟 Key Features

* 🦙 **Multi-LLM Provider Architecture**: Seamlessly switch between **Ollama (Local - 100% Free)**, **OpenAI (Cloud)**, and **Google Gemini (Cloud)** via configuration or per-request overrides.
* 🗄️ **Master JSON & Vector Dual Storage**: Maintains `data/epic_scenarios.json` as a readable master source of truth on disk, while indexing dense vector embeddings in **ChromaDB** for sub-100ms vector retrieval.
* 🧘 **Guidance Mode**: Solves modern real-world dilemmas (*"family business conflict"*, *"whistleblowing"*) by retrieving character solutions (Rama, Krishna, Arjuna, Vibhishana).
* 📖 **Knowledge Mode**: Direct factual Q&A on ancient scriptures with shloka citations.
* 📱 **Expo / React Native Compatible**: 100% compatible with the React Native mobile frontend (`POST /chat`).

---

## 🏗️ Project Architecture

```
/home/sahil/chatbot-mythology/backend/
├── app/
│   ├── main.py                   # FastAPI server entry point & CORS
│   ├── config.py                 # Environment variables & configuration
│   ├── api/
│   │   └── chat.py               # POST /chat endpoint handler
│   ├── services/
│   │   ├── llm_factory.py        # Multi-Provider LLM Factory (Ollama, OpenAI, Gemini)
│   │   ├── embedding_factory.py  # Multi-Provider Embedding Factory
│   │   └── rag_service.py        # Dual RAG Engine (Guidance & Knowledge Modes)
│   └── models/
│       └── schemas.py            # Pydantic Request & Response Schemas
├── data/
│   ├── epic_scenarios.json       # Master readable JSON scenario cards file
│   └── nalanda_library/          # Scripture corpus (85,889 verses)
├── scripts/
│   ├── extract_scenarios.py      # Batch scenario card extractor script
│   └── ingest_vector_db.py       # ChromaDB vector indexer script
├── requirements.txt              # Python dependencies
└── .env.example                  # Environment template
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python**: 3.10+
* **Ollama (Optional for Local LLM)**: Running on `http://localhost:11434` with model `nomic-embed-text` installed.

### 2. Environment Setup

```bash
cd /home/sahil/chatbot-mythology/backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies (if not installed)
pip install -r requirements.txt
```

### 3. Running the FastAPI Backend Server

```bash
cd /home/sahil/chatbot-mythology/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

* 🌐 **Interactive Swagger API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* 🩺 **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📡 API Usage & Endpoints

### `POST /chat`

#### Request Payload:
```json
{
  "message": "My business partner is misusing company funds, what should I do?",
  "mode": "guidance",
  "character": "Krishna",
  "provider": "ollama"
}
```

#### Response Payload:
```json
{
  "reply": "Wisdom mapped from Krishna's teachings on Dharma and duty...",
  "mode": "guidance",
  "character": "Krishna",
  "provider_used": "ollama/qwen2.5",
  "sources": [
    {
      "scenario_title": "Vibhishana Leaving Ravana to Join Rama",
      "epic": "Ramayana",
      "character": "Vibhishana",
      "verse_citations": ["RAM_YK_CH016_V001"]
    }
  ]
}
```

---

## ⚙️ Data Pipeline Scripts

To re-extract or re-index scenario cards into ChromaDB:

```bash
# 1. Extract scenario cards to epic_scenarios.json
python scripts/extract_scenarios.py

# 2. Ingest scenario card vector embeddings into ChromaDB
python scripts/ingest_vector_db.py
```
