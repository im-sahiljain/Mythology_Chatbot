# 🎨 Master Mobile App UI Prompt & Specification for StitchMCP (`mobile_ui_stitch_prompt.md`)

Use this comprehensive prompt with **StitchMCP** or any modern UI design generator to create the full, high-fidelity mobile UI screens for the **Vedic RAG Mythology Decision Engine**.

---

## 🌌 1. Global Visual Aesthetics & Design System

### 🎨 Color Palette & Theme
* **Theme**: Deep Vedic Obsidian Dark Mode (`#090B10` background) with Glassmorphic overlays (`rgba(255, 255, 255, 0.04)`).
* **Primary Accent (Divine Gold)**: Linear gradient from `#F59E0B` (Amber) to `#D97706` (Gold) for buttons, active state rings, and CTA borders.
* **Secondary Accent (Peacock Cyan)**: `#06B6D4` / `#0891B2` for scripture citation badges and source links.
* **Tertiary Accent (Royal Purple)**: `#8B5CF6` / `#7C3AED` for character avatar crowns and persona glow effects.
* **Text**: High contrast Crisp White (`#F9FAFB`) for body text, Soft Muted Slate (`#9CA3AF`) for captions and metadata.

### 📐 Glassmorphism & UI Components
* **Glassmorphic Cards**: `backdrop-filter: blur(16px)`, border: `1px solid rgba(255, 255, 255, 0.08)`, border-radius: `20px`.
* **Streaming Answer FX**: Real-time typewriter streaming response effect with a blinking golden cursor (`|`).
* **Source Reference Cards**: Horizontal scroll carousel with glassmorphic cards displaying scripture citations (`[Mahabharata]`, `[Ramayana]`), verse IDs (`MBH_BP_CH025_V028`), and expandable English translations.

---

## 📱 2. Navigation Architecture (5 Dedicated Experience Pages)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP NAVIGATION: 5 EXPERIMENTAL CHAT MODES                                    │
│ [ 📜 Scholar ]  [ 👑 Persona ]  [ ⚖️ Adaptive ]  [ 🔄 2-Turn ]  [ 💬 Dialogue ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 3. Screen Specifications (Page-by-Page Prompt)

### 📜 Page 1: Epic Scholar (Universal RAG - `POST /chat`)
* **Header**: "Universal Epic Wisdom" with a glowing lotus icon.
* **Query Input**: Floating glassmorphic text box with a golden "Ask the Epics" button.
* **Streaming Answer Card**:
  * Displays real-time streaming response from the **Epic Scholar**.
  * Formatted in clean markdown with highlighted Sanskrit terms (*Dharma*, *Nishkama Karma*, *Svadharma*).
* **Scripture Sources Carousel**:
  * 3 distinct cards showing the matched stories across Ramayana and Mahabharata.
  * Badges: `[Mahabharata: Arjuna's Hesitation]`, `[Ramayana: Vibhishana's Exit]`, `[Ramayana: Rama's Resolve]`.

---

### 👑 Page 2: Character 1st-Person Roleplay (`POST /chat-character`)
* **Header**: "Speak with the Legends".
* **Horizontal Avatar Carousel**:
  * Scrollable character avatars: **Krishna**, **Sita**, **Vibhishana**, **Drona**, **Arjuna**, **Karna**, **Sugriva**.
  * Active character gets a glowing golden halo ring and a crown badge.
* **Character Persona Banner**:
  * Displays active persona profile (*"Sita — Princess of Mithila & Voice of Unyielding Dharma"*).
* **Streaming 1st-Person Response Bubble**:
  * Styled as an authentic 1st-person quote (*"In the Ashoka Grove, I faced the might of Ravana..."*).
* **Filtered Source Cards**: Restricted strictly to Sita's Ramayana cards in the database.

---

### ⚖️ Page 3: Adaptive Completeness Chat (`POST /strategy/completeness`)
* **Header**: "Adaptive Guidance Engine".
* **Real-Time Completeness Meter Gauge**:
  * Radial progress meter showing **Completeness Score (0.00 – 1.00)**.
  * Status Badge: Changes dynamically from **`Needs Clarification (Score: 0.20)`** (Amber) to **`Resolved (Score: 0.85)`** (Emerald Green).
* **Interactive Option Chips (When Score < 0.70)**:
  * 3 clickable glassmorphic option cards:
    * `[ 💰 Financial or Ethical Fraud ]`
    * `[ 🎯 Difference in Vision & Strategy ]`
    * `[ 🤝 Family or Relational Pressure ]`
* **Instant Resolution (When Score $\ge$ 0.70)**: Automatically transitions into the final matched epic answer.

---

### 🔄 Page 4: Structured 2-Turn Decision Flow (`POST /strategy/two-turn`)
* **Header**: "2-Step Decision Tree".
* **Step Indicator**: Progress bar showing `Step 1 of 2: Context Selection` ➔ `Step 2 of 2: Epic Counsel`.
* **Turn 1 Option Cards**:
  * Full-width interactive cards with icons:
    * `[ 🛡️ Option A: Financial Fraud / Breach of Trust ]`
    * `[ ⚡ Option B: Strategic Mismatch / Vision Clash ]`
    * `[ ⚖️ Option C: Kinship / Family Favoritism ]`
* **Turn 2 Resolution View**: Upon tapping an option card, screen 2 smoothly animates in with the final matched epic story, 150-word counsel, and scripture proof cards.

---

### 💬 Page 5: Progressive Dialogue (`POST /strategy/progressive`)
* **Header**: "Progressive Dialogue Chat".
* **Multi-Turn Chat Thread**: Smooth scrolling chat thread displaying full conversation history.
* **Streaming Response Bubble**: Generates real-time advice and appends a glowing follow-up question pill (*"Does this epic perspective resonate with your situation?"*).
* **Follow-up Prompt Chips**: Suggested quick-reply pills at the bottom (`"Tell me more about Vibhishana's choice"`, `"How do I apply this to my boss?"`).

---

## 🤖 Master Prompt to Copy & Paste into StitchMCP:

```text
Create a stunning, high-fidelity mobile app UI in React Native for "Vedic RAG — Epic Mythology Decision Support System". 

App Aesthetics:
- Deep Dark Mode (#090B10) with Glassmorphism (backdrop blur, 1px subtle white borders).
- Celestial Gold Gradients (#F59E0B to #D97706) for primary CTAs and active states.
- Peacock Cyan (#06B6D4) for scripture badges and verse citations.

Create 5 distinct tab screens for 5 chat experiences:
1. Universal Chat Screen (Epic Scholar 3rd-person RAG with 3 source cards carousel).
2. Character Roleplay Screen (Horizontal avatar selector for Krishna, Sita, Vibhishana, Drona with 1st-person quote bubbles).
3. Adaptive Completeness Screen (Circular completeness meter 0.0-1.0, status badge, and clickable option chips for vague queries).
4. Two-Turn Chat Screen (Step 1 of 2 progress bar, 3 full-width option cards, and Turn 2 instant resolution).
5. Progressive Dialogue Screen (Multi-turn chat thread with streaming responses and follow-up prompt pills).

Ensure all components feature typewriter streaming animation FX for text responses and expandable scripture citation cards!
```
