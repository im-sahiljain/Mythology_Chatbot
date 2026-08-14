# 🏛️ Complete System Architecture & Data Flow Guide (`flow.md`)

> **Project Vision**: An AI-powered Decision Support System that translates modern real-world dilemmas (workplace politics, business betrayal, duty vs. family) into analogous narrative situations and philosophical principles from the ancient Indian epics (**Ramayana** & **Mahabharata**), returning actionable, character-authentic guidance.

---

## 📑 Table of Contents
1. [High-Level Architecture & Diagram Mapping](#1-high-level-architecture--diagram-mapping)
2. [Data Lifecycle: From Raw Verses to Scenario Cards](#2-data-lifecycle-from-raw-verses-to-scenario-cards)
3. [How Data is Structured](#3-how-data-is-structured)
4. [Vector Database: How ChromaDB Stores and Searches Data](#4-vector-database-how-chromadb-stores-and-searches-data)
5. [The Runtime Flow: Step-by-Step Execution of a User Query](#5-the-runtime-flow-step-by-step-execution-of-a-user-query)
6. [What Gemini Takes & How Gemini Processes the Context](#6-what-gemini-takes--how-gemini-processes-the-context)
7. [Query Options: Everything You Can Pass to the API](#7-query-options-everything-you-can-pass-to-the-api)
8. [Extensibility: What Other Options Can Be Added in the Future?](#8-extensibility-what-other-options-can-be-added-in-the-future)

---

## 1. High-Level Architecture & Diagram Mapping

Below is the mapping of your handwritten architecture diagram into technical components:

```
┌─────────────────┐       ┌──────────────────────┐       ┌───────────────────────┐
│   USER INPUT    │ ────► │     VECTOR DB        │ ────► │   BACKEND SELECTION   │
│ (Prompt + Config│       │     (ChromaDB)       │       │    (RAG Assembler)    │
└────────┬────────┘       └──────────┬───────────┘       └───────────┬───────────┘
         │                           │                               │
         ▼                           ▼                               ▼
┌─────────────────┐       ┌──────────────────────┐       ┌───────────────────────┐
│  Options Array  │       │ epic_scenarios.json  │       │        GEMINI         │
│ (Persona/Mode/  │       │  (Master 300-500     │       │  (Gemini 3.1 Flash    │
│    Provider)    │       │    Scenario Cards)   │       │   Lite / 150 words)   │
└─────────────────┘       └──────────────────────┘       └───────────────────────┘
```

1. **User Input + Options (Left Octagon)**: The user provides their dilemma along with client-selected configurations (`character`, `mode`, `provider`).
2. **Vector DB + Scenario Store (Center Octagon)**: ChromaDB performs mathematical dense vector similarity search to find which epic scenario matches the user's dilemma.
3. **Backend Selection**: The FastAPI service fetches the matching story card, extracts the philosophical principle (*Dharma*), and constructs a custom prompt.
4. **Gemini (Right Box)**: Gemini 3.1 Flash Lite processes the context and persona instructions, returning a first-person, crisp (<150 words) response.

---

## 2. Data Lifecycle: From Raw Verses to Scenario Cards

### The Semantic Gap Problem
If you search raw ancient verses directly for *"my coworker stole my project"*, standard search fails because ancient texts contain words like *"chariots"*, *"bows"*, and *"arrows"*, not modern workplace terminology.

To solve this, we use an **Offline Ingestion Pipeline**:

```
[85,889 Raw Verses] ──► [Episode Chunker] ──► [Gemini 3.1 Extractor] ──► [epic_scenarios.json] ──► [ChromaDB Vectors]
```

### The 4 Offline Stages:
1. **Raw Ingestion**: The script reads 85,889 raw Sanskrit & English verses from `data/nalanda_library/`.
2. **Episode Chunking (50–100 Verses)**: 
   * A single verse (*"Ravana sat on his throne"*) has no moral dilemma.
   * A 50–100 verse block contains a complete narrative scene (Conflict $\rightarrow$ Debate $\rightarrow$ Choice $\rightarrow$ Moral Consequence).
3. **AI Metadata Extraction (`scripts/extract_scenarios.py`)**:
   * Gemini reads each 50–100 verse block and translates it into abstract modern search tags (e.g., *"whistleblowing"*, *"unethical leadership"*, *"family business conflict"*).
4. **Dual Storage Sync**:
   * **Master JSON on Disk**: Stored in `data/epic_scenarios.json` as the human-readable source of truth.
   * **Vector Store**: Upserted into ChromaDB (`./chroma_db`) for sub-100ms vector lookups.

---

## 3. How Data is Structured

### A. Raw Verse Format (`nalanda_corpus_part_*.txt`)
```text
Source: Itihasa
Category: Ramayana
Title: Verse 1234
Sanskrit: तस्य तद्वचनं श्रुत्वा...
English: Having heard these words of Vibhishana, Ravana was enraged...
```

### B. Canonical Scenario Card Format (`epic_scenarios.json`)
Every scenario extracted by Gemini is strictly validated against this JSON schema:

```json
{
  "scenario_id": "RAM_YUDDHA_016",
  "epic": "Ramayana",
  "parva_kanda": "Yuddha Kanda",
  "chapter_sarga": "Chapter 16",
  "title": "Vibhishana Leaving Ravana to Join Rama",
  "entities": {
    "protagonist": { "canonical_name": "Vibhishana", "role": "Prince of Lanka" },
    "mentor_advisor": { "canonical_name": "Rama", "role": "Righteous King" },
    "opponents_relatives": [
      { "canonical_name": "Ravana", "relationship": "Brother / King" }
    ]
  },
  "dilemma_profile": {
    "primary_category": "Duty_vs_Kinship",
    "abstract_search_tags": [
      "whistleblowing",
      "unethical leadership",
      "reporting brother",
      "family business conflict",
      "leaving corrupt organization"
    ]
  },
  "narrative_context": {
    "narrative_summary": "Vibhishana advises Ravana to return Sita. Ravana insults him. Vibhishana chooses to leave Lanka and side with Rama."
  },
  "resolution_and_advice": {
    "decision_made": "Vibhishana rejects unrighteous family loyalty to uphold universal ethics.",
    "primary_philosophical_principle": {
      "sanskrit_term": "Dharma",
      "core_teaching": "Universal ethics and duty transcend unrighteous family or corporate bonds."
    }
  },
  "scripture_citations": {
    "primary_verses": [
      { "verse_id": "RAM_YK_CH016_V001", "english": "Having heard these words of Vibhishana..." }
    ]
  }
}
```

---

## 4. Vector Database: How ChromaDB Stores and Searches Data

ChromaDB is an **embedded vector database** that runs locally inside the Python process (no external servers needed).

### What ChromaDB Receives During Ingestion:
For each Scenario Card, the script `scripts/ingest_vector_db.py` creates:

1. **Document Text (Search Content)**:
   ```text
   Title: Vibhishana Leaving Ravana to Join Rama.
   Epic: Ramayana.
   Category: Duty_vs_Kinship.
   Tags: whistleblowing unethical leadership reporting brother family business conflict.
   Summary: Vibhishana urges Ravana to return Sita. Ravana insults him...
   Principle: Universal ethics and duty transcend unrighteous family bonds.
   ```
2. **Metadata Object (Filterable Attributes)**:
   ```json
   {
     "scenario_id": "RAM_YUDDHA_016",
     "title": "Vibhishana Leaving Ravana to Join Rama",
     "epic": "Ramayana",
     "primary_category": "Duty_vs_Kinship",
     "protagonist": "Vibhishana"
   }
   ```
3. **Unique ID**: `"RAM_YUDDHA_016_0"`

### What Happens During Search:
1. An embedding model (`all-MiniLM-L6-v2` or `nomic-embed-text`) converts the document text into a 384-dimensional numerical vector.
2. When a user asks: `"My partner is stealing money from our company"`, ChromaDB converts the user's sentence into a vector.
3. ChromaDB calculates the **Cosine Similarity** between the user query vector and all scenario vectors.
4. If the user selected `character: "Vibhishana"`, ChromaDB applies a metadata filter:
   ```python
   where={"protagonist": "Vibhishana"}
   ```
5. It returns the top 3 highest-scoring Scenario Cards.

---

## 5. The Runtime Flow: Step-by-Step Execution of a User Query

```
1. Mobile UI (Expo / React Native)
   └─► Sends POST http://localhost:8000/chat-character
       Payload: { "message": "My boss wants me to lie...", "character": "Vibhishana" }

2. FastAPI Gateway (`app/api/chat.py`)
   └─► Validates data using Pydantic `ChatRequest` schema.
   └─► Routes request to `rag_service.query_by_character()`.

3. RAG Engine & ChromaDB (`app/services/rag_service.py`)
   └─► Converts query to vector embedding.
   └─► Filters where: {"protagonist": "Vibhishana"}.
   └─► Retrieves top matching scenario: "Vibhishana Leaving Ravana".

4. Prompt Assembly (`app/services/rag_service.py`)
   └─► Injects Persona Instructions (Speak as Vibhishana, max 150 words).
   └─► Injects Retrieved Story Context.
   └─► Injects User's Dilemma.

5. LLM Provider Factory (`app/services/llm_factory.py`)
   └─► Dispatches prompt to Google Gemini 3.1 Flash Lite API.

6. Response Formatting & Return
   └─► Gemini generates 1st-person advice.
   └─► Backend packages response + scripture citations.
   └─► Returns JSON (200 OK) to Mobile Screen.
```

---

## 6. What Gemini Takes & How Gemini Processes the Context

When `rag_service.py` executes, it sends two distinct prompts to Gemini:

### 1. System Prompt (The Persona & Rule Engine)
```text
You are Vibhishana. You MUST answer strictly from your own personal life experiences,
events, and choices from your epic story.
DO NOT claim to have been present at events in other epics. Speak directly as Vibhishana
sharing how you dealt with your own struggles in Lanka.

RULES:
1. Speak in the authentic voice and persona of Vibhishana.
2. Draw 100% of your examples and lessons from your own personal life and decisions.
3. Offer practical, ethical guidance to the user's dilemma based on your life principles.
4. Keep your response extremely crisp, concise, and under a strict maximum limit of 150 words. Do not ramble.
```

### 2. User Prompt (The Dynamic Context)
```text
User's Modern Dilemma: "My boss is asking me to lie to clients, what should I do?"

Retrieved Epic Context:
--- SCENARIO 1 ---
Title: Vibhishana Leaving Ravana to Join Rama
Epic: Ramayana
Summary: Vibhishana advises Ravana to return Sita. Ravana insults him.
Vibhishana chooses to leave Lanka and side with Rama.
Principle: Universal ethics and duty transcend unrighteous family loyalty.

Provide wise, actionable guidance as Vibhishana to help the user resolve their dilemma.
```

### 3. What Gemini Generates (Live Output):
> *"I greet you with a heavy heart, for I know the bitterness of the choice that stands before you. I recall well the gilded halls of Lanka, where I stood as a brother to Ravana... When an authority figure demands you cast aside your integrity, remember: your loyalty is to Righteousness, not to a corrupt leader. First, give counsel and speak the truth. If they persist in deception, have the courage to depart. No position is worth the death of your conscience."*

---

## 7. Query Options: Everything You Can Pass to the API

### The Request Payload (`ChatRequest`):
```json
{
  "message": "My partner is misusing company funds, what should I do?",
  "mode": "guidance",
  "character": "Krishna",
  "provider": "gemini"
}
```

### Breakdown of the 4 Parameters:

| Option | Type | Required? | Default | Who Created It? | Why Does It Exist? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`message`** | `string` | **Yes** | — | Defined in `app/models/schemas.py` | Represents the user's actual prompt, dilemma, or question. |
| **`mode`** | `string` | No | `"guidance"` | Defined in `app/models/schemas.py` | Switches between **`"guidance"`** (Scenario matching & advice) and **`"knowledge"`** (Direct factual scripture Q&A). |
| **`character`** | `string` | No | `"Krishna"` | Defined in `app/models/schemas.py` | Determines the AI guide persona (`"Krishna"`, `"Rama"`, `"Vibhishana"`, `"Arjuna"`, `"Scholar"`). |
| **`provider`** | `string` | No | `"gemini"` | Defined in `app/models/schemas.py` | Routes the request dynamically to **`"gemini"`** (Cloud), **`"ollama"`** (Local offline), or **`"openai"`** (Cloud). |

---

## 8. Extensibility: What Other Options Can Be Added in the Future?

Because the backend is built using modular Pydantic schemas and factory patterns, we can add more query options without breaking existing functionality:

### 1. `epic` (Filter by Specific Scripture)
* **Options**: `"Ramayana"`, `"Mahabharata"`, `"Bhagavad Gita"`, `"All"`
* **How it works**: Adds `where={"epic": request.epic}` to the ChromaDB query.

### 2. `tone` (Emotional Delivery Style)
* **Options**: `"warrior"` (Direct, fierce), `"guru"` (Philosophical, calm), `"compassionate"` (Gentle, supportive)
* **How it works**: Injects tone adjectives into the LLM system prompt.

### 3. `max_words` (Dynamic Length Control)
* **Options**: `50`, `150`, `300`
* **How it works**: Overrides the 150-word constraint dynamically based on the client's screen size (e.g. smartwatch vs tablet).

### 4. `history` (Multi-Turn Chat Memory)
* **Structure**: `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`
* **How it works**: Allows users to ask follow-up questions while preserving conversation context.

---

## 9. Summary: How All Components Connect

```
Frontend (React Native / Web)
       │
       ▼ (HTTP POST /chat-character)
FastAPI Backend (`app/main.py`)
       │
       ├──► 1. Embedding Model converts text to Vector
       │
       ├──► 2. ChromaDB retrieves top Scenario Card from `epic_scenarios.json`
       │
       ├──► 3. Prompt Builder combines Story + Persona + 150-word rule
       │
       └──► 4. Gemini 3.1 Flash Lite generates response
       │
       ▼ (JSON Response with Reply + Sources)
Client Display Bubble + Scripture Reference Cards
```
