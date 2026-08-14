# 📘 Complete API Endpoints & Strategies Documentation (`strategies_guide.md`)

This guide documents all API endpoints in the system, detailing their **purpose**, **internal mechanics**, **request payloads**, and **sample responses**.

---

## 📑 Overview of Swagger Tags

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TAG 1: Core Chat Endpoints (Production Ready)                                │
│   • POST /chat            (Cross-Epic Universal Search / Epic Scholar)       │
│   • POST /chat-character  (Character-Strict 1st-Person Roleplay)            │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ TAG 2: Experimental Strategies (New Interaction Patterns)                    │
│   • POST /strategy/completeness          (Strategy 1: Adaptive Score)       │
│   • POST /strategy/two-turn              (Strategy 2: 2-Turn Flow)          │
│   • POST /strategy/progressive           (Strategy 3: Hybrid Search)        │
│   • POST /strategy/socratic-interviewer  (Strategy 4: Socratic Engine)     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 🟢 Section 1: Core Production Endpoints

## 1. `POST /chat` (Universal Cross-Epic Search)

### 📌 Purpose & Goal
Searches the entire database of **475+ Scenario Cards** across both Ramayana and Mahabharata without character bias. Provides objective ethical guidance from the **Epic Scholar** persona.

### ⚙️ How It Works
1. Receives the modern dilemma `message`.
2. Performs vector cosine similarity search on ChromaDB across **all 475 cards**.
3. Deduplicates matching scenario titles so the user receives distinct epic sources.
4. Generates an objective, 3rd-person response in under 150 words using Gemini.

### 📥 Request Payload
```json
{
  "message": "I feel conflicted because my company favors the founder's son over my most hardworking junior. What should I do?",
  "mode": "guidance",
  "provider": "gemini"
}
```

### 📤 Response Payload
```json
{
  "reply": "In the Mahabharata, Arjuna learns that personal attachment must not cloud one’s Dharma. In the Ramayana, Rama upholds truth despite immense personal cost...",
  "mode": "guidance",
  "character": "Epic Scholar",
  "provider_used": "gemini/gemini-3.1-flash-lite",
  "sources": [
    {
      "scenario_title": "Arjuna's Hesitation on the Battlefield of Kurukshetra",
      "epic": "Mahabharata",
      "character": "Arjuna"
    },
    {
      "scenario_title": "Vibhishana Leaving Ravana to Join Rama",
      "epic": "Ramayana",
      "character": "Vibhishana"
    }
  ]
}
```

---

## 2. `POST /chat-character` (Character-Strict 1st-Person Roleplay)

### 📌 Purpose & Goal
Roleplays **strictly as a chosen epic hero/heroine** (e.g. *Sita*, *Vibhishana*, *Drona*, *Karna*, *Krishna*), searching ONLY their personal stories and speaking in 1st person.

### ⚙️ How It Works
1. Receives the `message` and `character` parameter (e.g., `"Sita"`).
2. Applies a metadata filter on ChromaDB: `where={"protagonist": "Sita"}`.
3. Retrieves only cards belonging to Sita's life in the Ramayana.
4. Gemini roleplays as Sita in 1st person (*"When I, Sita, stood in Ashoka Grove..."*).

### 📥 Request Payload
```json
{
  "message": "I feel conflicted because my company favors the founder's son over my most hardworking junior. What should I do?",
  "character": "Sita",
  "mode": "guidance",
  "provider": "gemini"
}
```

### 📤 Response Payload
```json
{
  "reply": "In the Ashoka Grove, I faced the might of Ravana, who sought to sway me with power... In your workplace, favoritism is a shadow, but it does not diminish your junior's merit...",
  "mode": "guidance",
  "character": "Sita",
  "provider_used": "gemini/gemini-3.1-flash-lite",
  "sources": [
    {
      "scenario_title": "Sita's Firm Devotion and Rejection of Ravana's Proposal",
      "epic": "Ramayana",
      "character": "Sita"
    }
  ]
}
```

---

# 🧪 Section 2: Experimental Strategies (`tags=["Experimental Strategies"]`)

## 3. `POST /strategy/completeness` (Strategy 1: Adaptive Completeness Score)

### 📌 Purpose & Goal
Evaluates how detailed a query is (Score: 0.0 to 1.0). If vague (<0.70), it asks clarification questions first with 3 dynamic AI-generated category options. If detailed ($\ge$0.70), it gives the instant epic match!

### 📥 Request Payload (Vague Query)
```json
{
  "message": "I am thinking of quitting.",
  "provider": "gemini"
}
```

### 📤 Response Payload (`status: "needs_clarification"`)
```json
{
  "status": "needs_clarification",
  "completeness_score": 0.65,
  "reply": "To connect your dilemma to the exact epic story, please specify which situation best fits your struggle:",
  "options": [
    "Feeling burnt out lately?",
    "Seeking new career growth?",
    "Unsatisfied with current culture?"
  ],
  "sources": []
}
```

---

## 4. `POST /strategy/two-turn` (Strategy 2: Structured 2-Turn Flow)

### 📌 Purpose & Goal
Guarantees a predictable **2-Message Turn Flow** for mobile app UIs: Turn 1 gathers dynamic clarification option chips; Turn 2 delivers the final matched answer.

### 📥 Request Payload (Turn 1)
```json
{
  "message": "I am having a conflict with my business partner.",
  "turn": 1
}
```

### 📤 Response Payload (Turn 1)
```json
{
  "turn": 1,
  "reply": "I hear your heavy heart. To give you the exact story from the epics, which situation best describes your conflict?",
  "options": [
    "Dispute Over Equity & Shares",
    "Conflict in Product Vision",
    "Trust & Financial Transparency Issues"
  ],
  "sources": []
}
```

---

## 5. `POST /strategy/progressive` (Strategy 3: Progressive Hybrid Search)

### 📌 Purpose & Goal
Executes ChromaDB search on **every single turn**, providing epic advice immediately while appending a refining follow-up question to keep the conversation going naturally.

### ⚙️ How It Works
1. Merges previous `chat_history` with the user's latest message.
2. Performs vector cosine search on ChromaDB across all 475 cards.
3. On **Turn 1**, delivers initial epic advice AND appends a follow-up question (*"Does this epic perspective resonate with your situation, or is there a specific aspect you would like to explore deeper?"*).
4. On **Turn 2+**, incorporates the user's follow-up answer into the search query and delivers the refined, final epic counsel!

### 📥 Request Payload (Turn 1)
```json
{
  "message": "I am burned out and struggling at work.",
  "chat_history": []
}
```

### 📤 Response Payload (Turn 1)
```json
{
  "reply": "Your burnout is a fog obscuring your true nature. Remember Hanuman, who forgot his divine strength until reminded of his purpose...\n\nDoes this epic perspective resonate with your situation, or is there a specific aspect you would like to explore deeper?",
  "sources": [
    {
      "scenario_title": "The Awakening of Hanuman's Potential",
      "epic": "Ramayana",
      "character": "Hanuman"
    }
  ]
}
```

---

## 🔮 6. `POST /strategy/socratic-interviewer` (Strategy 4: Autonomous Socratic Engine)

### 📌 Purpose & Goal
Acts as an **Autonomous AI Counselor**. Asks deep Socratic follow-up questions to understand the user's situation before giving any final advice. 

### 🛡️ Safety Brake & Manual Override Features
1. **Dynamic LLM Context Evaluation**: Evaluates whether sufficient context is present.
2. **Turn 3 Safety Brake**: If the user reaches **Turn 3**, the system automatically forces `status: "resolved"` so the user is never trapped in an endless interview!
3. **Manual Override (`force_resolve: true`)**: If the user taps the **`[ Give Me Counsel Now ]`** button in the mobile app, it immediately forces final epic resolution!

### 📥 Request Payload (Interviewing Phase)
```json
{
  "message": "I am thinking of quitting my startup.",
  "chat_history": [],
  "force_resolve": false
}
```

### 📤 Response Payload (`status: "interviewing"`)
```json
{
  "status": "interviewing",
  "reply": "I hear the weight of this uncertainty, for the path of the creator is often lonely. Are you seeking to leave because the fire of your original vision has dimmed, or because the exhaustion has eclipsed your purpose?",
  "character": "Epic Counselor",
  "provider_used": "gemini/gemini-3.1-flash-lite",
  "sources": []
}
```

### 📥 Request Payload (Manual Override or Turn 3 Resolution)
```json
{
  "message": "My manager expects me to forge audit reports or be fired.",
  "chat_history": [
    {"role": "user", "content": "I am thinking of quitting my startup."},
    {"role": "assistant", "content": "Is it values or stability?"}
  ],
  "force_resolve": true
}
```

### 📤 Response Payload (`status: "resolved"`)
```json
{
  "status": "resolved",
  "reply": "✨ **Final Epic Counsel**\n\nIn the Ramayana, Sage Vashistha refused to compromise his principles despite the coercive power of a King...",
  "character": "Epic Scholar",
  "provider_used": "gemini/gemini-3.1-flash-lite",
  "sources": [
    {
      "scenario_title": "The Conflict between Vishvamitra and Vashistha",
      "epic": "Ramayana",
      "character": "Vishvamitra"
    }
  ]
}
```

---

# 📊 Section 3: Master Architecture & Strategy Comparison Table

The following master comparison table details how each endpoint works, its internal data flow, vector search execution timing, turn structure, and best use case:

| Endpoint & Tag | Strategy Pattern | Internal Mechanics & Data Flow | Vector Search Timing | Turn & UI Interaction Flow | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`POST /chat`** <br>`(Core)` | **Universal Cross-Epic Search** | User query $\rightarrow$ Cosine similarity vector search across all 475+ scenario cards $\rightarrow$ Deduplicates matching titles $\rightarrow$ Gemini generates objective 3rd-person guidance | **Turn 1** <br>(Immediate ChromaDB search) | **Single Turn** <br>(Direct Q&A response with scripture citation cards) | Quick, direct objective guidance across all epics without character roleplay |
| **`POST /chat-character`** <br>`(Core)` | **1st-Person Character Roleplay** | User query + Character $\rightarrow$ Metadata filter `where={"protagonist": Character}` on ChromaDB $\rightarrow$ Retrieves protagonist stories $\rightarrow$ Gemini roleplays in 1st person | **Turn 1** <br>(Metadata-filtered ChromaDB search) | **Single Turn** <br>(1st-person character voice response with quotes) | Emotional, immersive counsel from a specific hero (e.g. Sita, Krishna, Vibhishana) |
| **`POST /strategy/completeness`** <br>`(Experimental)` | **Strategy 1: Adaptive Completeness Engine** | User query $\rightarrow$ Evaluates clarity score (0.0 to 1.0). If <0.70, calls Gemini to dynamically generate 3 sub-category options. If $\ge$0.70, executes vector search | **Deferred** <br>(Only searches ChromaDB when score $\ge$ 0.70) | **Adaptive Multi-Turn Chat** <br>(Displays auto-sending dynamic chips until prompt details reach $\ge$ 0.70) | Handling vague user inputs (e.g. "I have a problem") by guiding them into detailed sub-causes |
| **`POST /strategy/two-turn`** <br>`(Experimental)` | **Strategy 2: Structured 2-Step Decision Tree** | **Turn 1**: Generates 3 dynamic option chips without vector search. <br>**Turn 2**: Receives selected option, combines it with initial prompt, and runs vector search | **Turn 2 Only** <br>(Defers vector search to step 2) | **Strict 2-Step Chat Flow** <br>(Step 1: Category chips $\rightarrow$ Step 2: Final answer & evidence cards) | Predictable 2-step decision wizard UI where structured user selection is required |
| **`POST /strategy/progressive`** <br>`(Experimental)` | **Strategy 3: Progressive Hybrid Search** | **Turn 1**: Vector search $\rightarrow$ Initial answer + follow-up question. <br>**Turn 2**: Appends follow-up answer to history $\rightarrow$ Re-runs vector search on combined history | **Every Turn** <br>(Executes ChromaDB search on Turn 1 AND Turn 2+) | **Progressive Dialogue** <br>(Continuous chat thread with real-time citation updates on every turn) | Exploratory conversations where user wants initial advice first and refines it progressively |
| **`POST /strategy/socratic-interviewer`** <br>`(Experimental)` | **Strategy 4: Autonomous Socratic Engine** | User prompt + thread $\rightarrow$ Gemini evaluates context sufficiency. If insufficient, asks 1 deep Socratic question. If sufficient (or Turn 3 safety brake / `force_resolve`), runs vector search | **Final Resolution Only** <br>(Defers vector search until full context is gathered) | **Autonomous Socratic Counseling** <br>(Continuous Q&A thread with `[ Give Me Counsel Now ]` override button) | Deep personal dilemmas (career, ethical, family) requiring an AI mentor that listens before advising |
