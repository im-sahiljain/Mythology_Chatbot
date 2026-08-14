# 📊 System Flowchart: Complete End-to-End Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                         STEP 1: USER QUERY (CLIENT)                          │
│             (Message Text + Character Persona + Mode + Provider)             │
│                                                                              │
└───────────────────▲──────────────────────────────────────┬───────────────────┘
                    │                                      │
                    │ 6. Returns Final JSON Response       │ 1. Sends HTTP POST Request
                    │    (AI Reply + Scripture Sources)    │    (/chat or /chat-character)
                    │                                      ▼
┌───────────────────┴──────────────────────────────────────────────────────────┐
│                                                                              │
│                   STEP 2: FASTAPI BACKEND ORCHESTRATOR                       │
│                     (The Application Brain & Logic)                          │
│                      (app/services/rag_service.py)                           │
│                                                                              │
│   - Validates request payload via Pydantic (`ChatRequest`)                   │
│   - Triggers Vector Search on ChromaDB with persona filters                  │
│   - Assembles prompt with story context & 150-word constraint                │
│   - Calls LLM Factory (Gemini 3.1 Flash Lite) & returns JSON to Client       │
│                                                                              │
└───────────────────┬───────────────────────────────────────▲──────────────────┘
                    │                                       │
2. query(where={})  │ 3. Returns Story                      │ 4. Dispatches Prompt
                    │    Cards & Verses                     │ 5. Returns 150-word Advice
                    ▼                                       ▼
┌──────────────────────────────────────┐        ┌──────────────────────────────┐
│                                      │        │                              │
│       STEP 3: VECTOR DATABASE        │        │        STEP 4: GEMINI        │
│              (ChromaDB)              │        │   (Gemini 3.1 Flash Lite)    │
│  (Storage & Similarity Search Engine)│        │ (Roleplays Persona & Advice) │
│                                      │        │                              │
└───────────────────┬──────────────────┘        └──────────────────────────────┘
                    │
                    ▼ (Connected to)
┌──────────────────────────────────────┐        ┌────────────────────────────────────────────────────────┐
│         epic_scenarios.json          │        │               HOW EACH CARD IS CONVERTED:              │
│        (Master 300-500 Cards)        │ ◄───── │  1. Card JSON ➔ Title + Tags + Summary + Principle     │
│                                      │ (Ingest│  2. Build Text String: "Title:... Tags:... Summary:.." │
│                                      │ Pipeline) 3. Embedding Model encodes text ➔ 384-d Vector        │
│                                      │        │  4. collection.upsert(documents, metadatas, ids)       │
└──────────────────────────────────────┘        └────────────────────────────────────────────────────────┘
```

---

## 📦 1. User Query (Client Request)

### 📌 What is the User Query?
The **User Query** is the starting entry point of the entire application. It represents the user's real-world problem or dilemma submitted from the mobile app (Expo / React Native) or Web UI.

### 📥 What It Contains (The Request Payload)
When the user clicks **Send**, the frontend sends a structured JSON payload over HTTP to the backend API (`POST /chat` or `POST /chat-character`):

```json
{
  "message": "My business partner is misusing funds, what should I do?",
  "mode": "guidance",
  "character": "Krishna",
  "provider": "gemini"
}
```

---

## 🧠 2. FastAPI Backend Orchestrator (`rag_service.py`)

### 📌 What is the Backend Orchestrator?
The **Backend Orchestrator** is the central brain of the system. The client **never connects directly to the database or Gemini**; all communication flows through FastAPI and `rag_service.py`.

### ⚙️ What the Backend Does:
1. **Pydantic Validation**: Ensures the incoming payload is valid.
2. **Queries ChromaDB (Step 3)**: Sends the user dilemma text and applies the persona filter:
   ```python
   results = self.scenarios_collection.query(
       query_texts=[message],
       where={"protagonist": "Vibhishana"},
       n_results=3
   )
   ```
3. **Receives Matching Story & Verses**: ChromaDB returns the Top-3 matching Scenario Cards.
4. **Assembles the Gemini Prompt**: Injects character rules, story context, and the strict **150-word length constraint**.
5. **Calls Gemini (Step 4)**: Sends the assembled prompt to Gemini 3.1 Flash Lite.
6. **Returns JSON Response**: Packages the advice and scripture sources, sending a `200 OK` JSON response back to Step 1 (the mobile client).

---

## 🗄️ 3. Vector Database (ChromaDB & Scenario Store)

### 📌 What is the Vector Database?
The **Vector Database (ChromaDB)** is the storage and search engine (the *"Library Bookshelf"*). It holds dense mathematical embeddings of all **300–500 Scenario Cards** on disk.

---

### 🔨 HOW EACH SCENARIO CARD IS CONVERTED INTO A VECTOR (The 4 Steps in `scripts/ingest_vector_db.py`)

```
[ Scenario Card JSON ]
         │
         ▼
 1. Extract Key Fields: Title, Tags, Summary, Principle, Protagonist
         │
         ▼
 2. Assemble Master Document String:
    "Title: Arjuna's Hesitation... Tags: conflict of interest workplace ethics... Summary: ... Principle: ..."
         │
         ▼
 3. Neural Network Vectorization (Embedding Model):
    Converts the Document String into a 384-dimensional dense array of numbers:
    [ 0.0821, -0.1942, 0.6512, -0.0145, 0.4321, ... , 0.0892 ]
         │
         ▼
 4. ChromaDB Upsert (Saved to Disk at ./chroma_db):
    collection.upsert(
        documents=[search_text],
        metadatas=[{"protagonist": "Arjuna", "epic": "Mahabharata", "title": "..."}],
        ids=["MBH_BHISHMA_PARVA_GITA_001_0"]
    )
```

#### Detailed Code Explanation:

1. **Step 1: Extract Semantic Components**:
   From each JSON object in `epic_scenarios.json`, the script extracts:
   * `title`: *"Arjuna's Hesitation on the Battlefield"*
   * `abstract_search_tags`: `["conflict of interest", "reporting loved ones", "workplace ethics"]`
   * `narrative_summary`: *"Arjuna refuses to fight because emotional attachment to family clouds duty."*
   * `core_teaching`: *"Perform duty without attachment to personal consequences."*

2. **Step 2: String Synthesis**:
   Combines these fields into a single rich text block:
   ```python
   search_text = f"Title: {title}. Epic: {epic}. Category: {category}. Tags: {tags_str}. Summary: {summary}. Principle: {principle}"
   ```

3. **Step 3: Neural Embedding**:
   ChromaDB's embedding model passes this text string through a Transformer neural network to generate a **384-dimensional vector coordinate**.

4. **Step 4: Storage with Metadata**:
   Stores the vector, raw text, and metadata dictionary (`protagonist`, `epic`, `scenario_id`) in local persistent disk storage (`./chroma_db`).

---

## 🤖 4. Gemini (LLM Generation Engine)

### 📌 What is Gemini's Role?
**Gemini 3.1 Flash Lite** is the generation engine. It receives the assembled prompt from the backend, acts as the requested character persona (e.g. *Vibhishana*), reflects on the matched epic story, and generates a **crisp, actionable response under 150 words**.

---

## 📤 5. Final Output (Return to User Client)

The backend sends the final `ChatResponse` JSON back to the mobile screen:

```json
{
  "reply": "Arjuna of the modern age, listen closely... When you see funds being misused, trust is eroded. Follow the path of Dharma...",
  "mode": "guidance",
  "character": "Krishna",
  "provider_used": "gemini/gemini-3.1-flash-lite",
  "sources": [
    {
      "scenario_title": "Vibhishana Leaving Ravana to Join Rama",
      "epic": "Ramayana",
      "verse_citations": ["RAM_YK_CH016_V001"]
    }
  ]
}
```
