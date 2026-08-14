# 🏛️ VedicRAG AI — Master Project Documentation

**Project Name**: VedicRAG AI (Universal Epic Scholar & Mythology Decision Support Engine)  
**Codebase**: FastAPI (Backend) + React Native / Expo Web (Frontend) + ChromaDB (Vector Store) + Google Gemini (LLM)  
**Database**: 475+ Curated Scenario Cards from the *Ramayana* and *Mahabharata*

---

## 📌 Table of Contents
1. [Executive Summary & Core Vision](#1-executive-summary--core-vision)
2. [Core Functional Requirements & Strategy Modes](#2-core-functional-requirements--strategy-modes)
3. [Frontend UI/UX Architecture & Design System](#3-frontend-uiux-architecture--design-system)
4. [Issues Encountered, Root Causes & Solutions](#4-issues-encountered-root-causes--solutions)
5. [RAG Mechanics & Vector Search Deep Dive](#5-rag-mechanics--vector-search-deep-dive)
6. [Endless Chat & Follow-up Architecture Roadmap](#6-endless-chat--follow-up-architecture-roadmap)
7. [Running & Deployment Guide](#7-running--deployment-guide)

---

## 1. Executive Summary & Core Vision

VedicRAG AI is an AI-powered philosophical counseling and decision-support system. It translates modern human dilemmas (workplace politics, family disputes, ethical conflicts, domestic challenges, grief) into timeless philosophical guidance grounded in **475+ structured scenario cards** from ancient Indian epics (*Ramayana* & *Mahabharata*).

### Key Differentiators:
* **Evidence-Grounded (RAG)**: Never gives raw hallucinated opinions; attaches exact scripture source cards (Epic, Scenario Title, Characters, Summary Snippet).
* **Multi-Strategy Counseling**: Provides multiple interaction paradigms ranging from single-shot Q&A to interactive Socratic diagnostic interviews.
* **Humanized Simplicity**: Delivers wisdom through relatable storytelling in simple, everyday language rather than heavy academic jargon.

---

## 2. Core Functional Requirements & Strategy Modes

The system is structured across 6 core endpoints/screens:

```
                                  ┌──────────────────────────────┐
                                  │      VedicRAG AI System      │
                                  └──────────────┬───────────────┘
                                                 │
    ┌──────────────┬──────────────┬──────────────┼──────────────┬──────────────┐
    ▼              ▼              ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ Screen 1│  │ Screen 2 │  │  Screen 3  │  │ Screen 4  │  │ Screen 5  │  │ Screen 6  │
│ Scholar │  │ Persona  │  │  Adaptive  │  │  2-Turn   │  │ Dialogue  │  │ Counselor │
│ (Direct)│  │ (Roleplay│  │ (Clarity)  │  │ (Decision)│  │(Hybrid RAG│  │(Socratic) │
└─────────┘  └──────────┘  └────────────┘  └───────────┘  └───────────┘  └───────────┘
```

### 1. Universal Epic Scholar (`POST /chat`)
* **Role**: 3rd-person objective scholar synthesizing lessons from across both epics.
* **Flow**: User inputs dilemma $\rightarrow$ Vector search queries ChromaDB $\rightarrow$ LLM returns storytelling counsel + horizontal scripture citation cards.

### 2. Character Persona Mode (`POST /chat-character`)
* **Role**: 1st-person roleplay as legendary figures:
  * 🌸 **Sita** (Moral Dignity & Dharma)
  * 🪶 **Krishna** (Karma & Svadharma)
  * 🛡️ **Vibhishana** (Righteous Whistleblowing)
  * 🏹 **Drona** (Duty & Mastery)
  * 🎯 **Arjuna** (Moral Hesitation)
  * 🌅 **Karna** (Loyalty & Sacrifice)
  * 👑 **Sugriva** (Alliance & Honor)
* **Flow**: ChromaDB applies strict metadata filter (`protagonist == Character`) $\rightarrow$ LLM speaks in 1st person ("I").

### 3. Adaptive Clarity Engine (`POST /strategy/completeness`)
* **Role**: Evaluates query completeness before generating advice.
* **Flow**:
  * If Clarity $< 70\%$: Displays score badge (e.g., `45% Clarity`) and generates 3 dynamic interactive option chips.
  * Clicking an option auto-sends it to the thread and locks the chip.
  * If Clarity $\ge 70\%$: Transitions into resolved state and outputs final counsel.

### 4. 2-Step Decision Tree (`POST /strategy/two-turn`)
* **Role**: Deterministic, 2-turn classification.
* **Flow**: Turn 1 categorizes the problem into branches $\rightarrow$ Turn 2 queries ChromaDB specifically on that branch and delivers targeted advice.

### 5. Progressive Hybrid Dialogue (`POST /strategy/progressive`)
* **Role**: Multi-turn chat with live vector retrieval on every turn.
* **Flow**: Every user message passes full conversation history and triggers a fresh vector search.

### 6. Socratic Master Counselor (`POST /strategy/socratic-interviewer`)
* **Role**: Empathetic AI mentor that refuses to give premature advice.
* **Flow**:
  1. An internal **Context Sufficiency Evaluator** checks if root causes/stakes are clear.
  2. If `INSUFFICIENT`: Asks 1 deep Socratic diagnostic question without giving final advice.
  3. If `SUFFICIENT` or User clicks **"Give Me Counsel Now" (Force Resolve)**: Queries ChromaDB and generates comprehensive final counsel.

---

## 3. Frontend UI/UX Architecture & Design System

### Design Tokens
* **Dark Mode (`#09090B`)**: Deep zinc tones, gold accents (`#D4A853`), purple (`#A78BFA`), teal (`#2DD4BF`), and green (`#4ADE80`).
* **Warm Light Mode (`#FAFAF8`)**: Cream surfaces with crisp text and subtle border contrasts.

### Motion & Component Primitives
* **`FadeSlide`**: Smooth directional entrance (slide-up, slide-left, slide-right) with spring physics.
* **`Pressable`**: Tactile scale-down spring effect (0.97 scale) on touch/click.
* **`TypingDots`**: 3-dot animated pulse loader.
* **`Card`**: Standardized elevation container.

### Component Overhaul
* **`StreamingText.tsx`**: Typewriter effect with thin blinking cursor bar (`▎`).
* **`SourceCard.tsx`**: Color-coded top stripes and horizontal scroll.
* **`AvatarSelector.tsx`**: Rounded-square avatars with pulsing selection ring and spring character banner.
* **`OptionChips.tsx`**: Staggered entry with interactive arrow indicators (`→`).

---

## 4. Issues Encountered, Root Causes & Solutions

| # | Issue / Problem | Root Cause | Implemented Solution |
| :--- | :--- | :--- | :--- |
| **1** | **Hinglish input matched English database cards** | User asked how *"samajh kya kahega"* matched English Sita cards. | **Semantic Embedding Space**: Dense embeddings (`all-MiniLM-L6-v2`) map Hinglish concepts to the same mathematical vector cluster as *"societal judgment/public scrutiny"*. Cosine similarity retrieves the closest story regardless of language. |
| **2** | **Complex academic vocabulary in final counsel** | AI generated words like *"inconsolable grief"*, *"insurmountable"*, *"dharma of survival"*. | **Prompt Simplification Rules**: Added strict 6th-grade vocabulary constraint, short sentence rules, storytelling format, and simplified explanation for Sanskrit terms (e.g., *"Dharma (duty to protect yourself)"*). |
| **3** | **Unused `Krishna` in Socratic Counselor log** | Terminal printed `Requested Char: Krishna` during Socratic resolution. | **Default Argument Clarification**: `character="Krishna"` was a Python default function argument in `RAGService.query()`. `strict_character=False` ensured ChromaDB searched all epics and AI spoke as neutral `Epic Scholar`. |
| **4** | **TypeScript Build Failures (`str` vs `string`)** | `api.ts` contained Python `str` types instead of TypeScript `string`. | Updated `api.ts` interfaces (`ChatResponse`, `SocraticResponse`, etc.) to valid TypeScript types. Type check passed with 0 errors. |
| **5** | **Lack of visibility into AI Prompts & Parameters** | Hard to debug what prompt was sent and what characters were retrieved. | Added structured diagnostic terminal logging in `rag_service.py` and `strategy_service.py` displaying parameters, system prompts, context, and generated counter-questions. |

---

## 5. RAG Mechanics & Vector Search Deep Dive

```
User Query: "m aapki baat samaj sakti hu but samajh kya kahega mere baare me"
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │ 1. Vector Conversion (all-MiniLM-L6-v2)   │
      │    Converts text to 384-dimensional vector│
      └─────────────────────┬─────────────────────┘
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │ 2. ChromaDB HNSW Index                    │
      │    Calculates Cosine Distance             │
      │    Retrieves: Sita & Ayodhya Scrutiny     │
      └─────────────────────┬─────────────────────┘
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │ 3. Gemini LLM (gemini-2.0-flash)          │
      │    • Detects fear/sentiment in Hinglish   │
      │    • Synthesizes empathetic counsel       │
      └───────────────────────────────────────────┘
```

* **ChromaDB**: Storage & mathematical distance engine. Does not understand sentiment or emotions.
* **Embedding Model (`all-MiniLM-L6-v2`)**: Converts text into numerical vectors.
* **Gemini LLM**: Reads both user query and retrieved scripture cards to detect sentiment, tone, and synthesize guidance.

---

## 6. Endless Chat & Follow-up Architecture Roadmap

To support continuous follow-up conversations (like ChatGPT & Claude) after the final counsel:

### 1. The RAG Follow-up Challenge
Literal follow-ups (e.g., *"Why did he do that?"*) fail in vector search because pronouns lack search context.

### 2. The 3-Step Solution Architecture
1. **Chat Memory (Thread Management)**: Maintain message transcript array `[{role, content}]`.
2. **Query Router & Tool Calling**:
   * *Clarification questions* (e.g., *"Explain step 2 simpler"*) $\rightarrow$ **Skip Vector Search**, answer directly from chat history.
   * *New story requests* (e.g., *"What about Mahabharata?"*) $\rightarrow$ **Query ChromaDB**.
3. **Memory Compaction for Endless Chats**:
   * **Sliding Window**: Send last 6–10 messages to the LLM.
   * **Rolling Summary**: Summarize earlier conversation turns into 1 paragraph and keep recent messages full-length.

---

## 7. Running & Deployment Guide

### Backend (FastAPI)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
* **API Base URL**: `http://localhost:8000`
* **Swagger Docs**: `http://localhost:8000/docs`

### Frontend (React Native / Expo Web)
```bash
cd frontend
npx expo start --web
```
* **Web URL**: `http://localhost:8081`
