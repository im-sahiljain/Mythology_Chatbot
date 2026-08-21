import json
import chromadb
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.llm_factory import LLMFactory
from app.models.schemas import SourceCitation


def _parse_verses(raw_verses) -> List[str]:
    if not raw_verses:
        return []
    import ast
    parsed = raw_verses
    if isinstance(raw_verses, str):
        try:
            parsed = json.loads(raw_verses)
        except Exception:
            try:
                parsed = ast.literal_eval(raw_verses)
            except Exception:
                return [raw_verses]
    
    if isinstance(parsed, list):
        formatted = []
        for item in parsed:
            if isinstance(item, dict):
                v_id = item.get('verse_id', '').replace('_', ' ')
                text = item.get('english', '')
                if text and v_id:
                    formatted.append(f'{v_id}: "{text}"')
                elif text:
                    formatted.append(f'"{text}"')
                elif v_id:
                    formatted.append(v_id)
            elif isinstance(item, str):
                formatted.append(item)
        return formatted
    return [str(parsed)]

LANGUAGE_MAP: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "sa": "Sanskrit (संस्कृतम्)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "bn": "Bengali (বাংলা)",
    "mr": "Marathi (मराठी)",
    "gu": "Gujarati (ગુજરાતી)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "or": "Odia (ଓଡ଼ିଆ)",
    "as": "Assamese (অসমীয়া)",
    "ur": "Urdu (اردو)",
    "mai": "Maithili (मैथिली)",
    "ks": "Kashmiri (कॉशुर)",
    "ne": "Nepali (नेपाली)",
    "sd": "Sindhi (سنڌي / सिंधी)",
    "kok": "Konkani (कोंकणी)",
    "doi": "Dogri (डोगरी)",
    "mni": "Manipuri (মৈতৈলোন্)",
    "brx": "Bodo (बड़ो)",
    "sat": "Santali (संताली)",
}

def get_language_directive(language_code: Optional[str] = "en") -> str:
    code = (language_code or "en").lower().strip()
    lang_name = LANGUAGE_MAP.get(code, "English")
    if code == "en":
        return "\nLANGUAGE: Respond in clear, compassionate, everyday English."
    
    return f"""
LANGUAGE & SCRIPT INSTRUCTION (CRITICAL):
- You MUST respond ENTIRELY in {lang_name} using authentic native script and vocabulary.
- If the seeker communicates in Roman script (e.g. Hinglish / Tanglish), understand their dilemma completely and respond in fluent {lang_name} native script.
- Maintain your divine persona, profound mythological wisdom, and warm empathy while speaking fluently in {lang_name}.
"""

class RAGService:
    """Core Dual RAG Service handling General Guidance, Knowledge Mode, and Character-Strict Guidance."""

    def __init__(self):
        self.chroma_client = None
        self.scenarios_collection = None
        self._init_chroma()

    def _init_chroma(self):
        try:
            settings.CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=str(settings.CHROMA_DB_DIR))
            self.scenarios_collection = self.chroma_client.get_or_create_collection("epic_scenario_cards")
        except Exception as e:
            print(f"Warning: ChromaDB initialization error: {e}")

    def query(
        self,
        message: str,
        mode: str = "guidance",
        character: Optional[str] = None,
        provider: str = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """General RAG Query (POST /chat) - Searches across all epic scenarios."""
        if mode == "guidance":
            return self._handle_guidance_query(message, character, provider, mode=mode, strict_character=False, language=language)
        else:
            return self._handle_knowledge_query(message, character or "Krishna", provider, language=language)

    def query_by_character(
        self,
        message: str,
        character: str = "Krishna",
        mode: str = "guidance",
        provider: str = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Character-Strict RAG Query (POST /chat-character) - Filters scenarios strictly from character's own story."""
        return self._handle_guidance_query(message, character, provider, mode=mode, strict_character=True, chat_history=chat_history, language=language)

    def _get_query_embedding(self, text_to_embed: str) -> Optional[List[float]]:
        """Generates 768-dim query embedding using Gemini."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            res = genai.embed_content(
                model="models/gemini-embedding-001",
                content=text_to_embed,
                task_type="retrieval_query",
                output_dimensionality=768
            )
            return res.get("embedding")
        except Exception as e:
            print(f"⚠️ [Embedding Error]: {e}")
            return None

    def _query_supabase_vector(
        self,
        search_query: str,
        character: Optional[str] = None,
        strict_character: bool = False
    ) -> List[SourceCitation]:
        """Performs cosine similarity vector search over Supabase pgvector."""
        sources: List[SourceCitation] = []
        try:
            from app.db.session import SessionLocal
            from sqlalchemy import text
            import json

            query_embedding = self._get_query_embedding(search_query)
            if not query_embedding:
                return []

            db = SessionLocal()
            try:
                rows = []
                # 1. Try character-filtered vector search if strict
                if strict_character and character:
                    sql = text("""
                        SELECT scenario_title, epic, protagonist, summary_snippet, verse_refs
                        FROM epic_scenario_embeddings
                        WHERE LOWER(protagonist) = LOWER(:character)
                        ORDER BY embedding <=> CAST(:query_vec AS vector)
                        LIMIT 5;
                    """)
                    rows = db.execute(sql, {
                        "character": character,
                        "query_vec": str(query_embedding)
                    }).fetchall()

                # 2. Fallback to cross-epic if no matches or not strict
                if not rows:
                    sql = text("""
                        SELECT scenario_title, epic, protagonist, summary_snippet, verse_refs
                        FROM epic_scenario_embeddings
                        ORDER BY embedding <=> CAST(:query_vec AS vector)
                        LIMIT 5;
                    """)
                    rows = db.execute(sql, {
                        "query_vec": str(query_embedding)
                    }).fetchall()

                seen_titles = set()
                for row in rows:
                    title = row.scenario_title
                    if title in seen_titles:
                        continue
                    seen_titles.add(title)

                    raw_refs = row.verse_refs
                    if isinstance(raw_refs, str):
                        try:
                            raw_refs = json.loads(raw_refs)
                        except Exception:
                            raw_refs = []

                    sources.append(SourceCitation(
                        scenario_title=title,
                        epic=row.epic,
                        character=row.protagonist or character,
                        verse_citations=_parse_verses(raw_refs),
                        summary_snippet=row.summary_snippet or ""
                    ))

                    if len(sources) >= 3:
                        break
            finally:
                db.close()

            if sources:
                print(f"\n📦 [Supabase pgvector] Retrieved {len(sources)} unique matching scenario card(s):")
                for s in sources:
                    print(f"   ➔ [{s.epic}] {s.scenario_title} (Protagonist: {s.character})")
        except Exception as e:
            print(f"⚠️ [Supabase pgvector Query Warning]: {e}")
        return sources

    def _handle_guidance_query(
        self,
        message: str,
        character: Optional[str] = None,
        provider: str = None,
        mode: str = "guidance",
        strict_character: bool = False,
        chat_history: Optional[List[Dict[str, Any]]] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        sources: List[SourceCitation] = []
        context_str = ""

        # Construct search query with user history context if needed
        search_query = message
        if chat_history and len(chat_history) > 1:
            user_texts = [h.get("content", "") for h in chat_history if h.get("role") == "user"]
            if user_texts:
                search_query = f"{' '.join(user_texts[-2:])} {message}".strip()

        # 1. Primary Vector Search: Supabase pgvector (Cloud + Local, 0 MB server RAM)
        sources = self._query_supabase_vector(search_query, character, strict_character)

        # 2. Fallback to Local ChromaDB if Supabase yielded 0 results
        if not sources and self.scenarios_collection and self.scenarios_collection.count() > 0:
            try:
                print(f"\n🔍 [Fallback Vector DB] Querying ChromaDB (Embedder: all-MiniLM-L6-v2) | strict: {strict_character} | character: '{character or 'None (Cross-Epic)'}'")
                query_kwargs = {"query_texts": [search_query], "n_results": 5}
                if strict_character and character:
                    query_kwargs["where"] = {"protagonist": character}

                results = self.scenarios_collection.query(**query_kwargs)

                if strict_character and (not results or not results.get("documents") or not results["documents"][0]):
                    query_kwargs.pop("where", None)
                    results = self.scenarios_collection.query(**query_kwargs)

                if results and results.get("documents"):
                    seen_titles = set()
                    for i, doc in enumerate(results["documents"][0]):
                        meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                        title = meta.get("title", "Epic Scenario")
                        if title in seen_titles:
                            continue
                        seen_titles.add(title)

                        clean_story = doc.strip()
                        if "Summary:" in doc:
                            summary_part = doc.split("Summary:")[1]
                            if "Principle:" in summary_part:
                                story, principle = summary_part.split("Principle:", 1)
                                clean_story = f"{story.strip().rstrip('.')}.\n\n✨ Core Teaching: {principle.strip()}"
                            else:
                                clean_story = summary_part.strip()

                        sources.append(SourceCitation(
                            scenario_title=title,
                            epic=meta.get("epic", "Ramayana/Mahabharata"),
                            character=meta.get("protagonist", character),
                            verse_citations=_parse_verses(meta.get("verse_refs")),
                            summary_snippet=clean_story
                        ))
                        if len(sources) >= 3:
                            break
            except Exception as e:
                print(f"ChromaDB Query Warning: {e}")

        # Assemble context string from sources
        if sources:
            for idx, s in enumerate(sources):
                context_str += f"\n--- SCENARIO {idx+1} ---\nTitle: {s.scenario_title}\nEpic: {s.epic}\nSummary: {s.summary_snippet}\n"

        lang_directive = get_language_directive(language)

        # Build System Prompt
        if strict_character:
            active_character = character or "Krishna"
            system_prompt = f"""
You are {active_character}. You MUST answer strictly from your own personal life experiences, events, and choices from your epic story.
DO NOT claim to have been present at events in other epics. Speak directly as {active_character} in 1st person sharing how you dealt with your own struggles.

RULES:
1. Speak in the authentic 1st-person voice and persona of {active_character}.
2. Draw 100% of your examples and lessons from your own personal life and decisions.
3. Offer practical, ethical guidance to the user's dilemma based on your life principles.
4. Maintain conversational continuity with the user, referencing prior context when appropriate.
5. Keep your response crisp, impactful, and under 170 words.
{lang_directive}
"""
        else:
            active_character = "Universal Epic Scholar"

            system_prompt = f"""
            You are a Wise Epic Guide of the Indian Epics (Ramayana & Mahabharata).
Your role is to offer warm, wise, and practical help for the user's dilemma by sharing relevant stories and lessons from the epics.

RULES:

1. LANGUAGE & VOCABULARY:
   - Keep sentences short, clear, and easy to understand with deep empathy.

2. STORYTELLING & EMPATHY:
   - First, reassure the user with warmth that they are not alone and others have faced similar hard times before.
   - Tell a story from the epics in simple words, explaining what happened to the character and how they solved or faced their problem. Do not assume the user knows the story.
   - Clearly connect that character's story to the user's current life situation.

3. SANSKRIT TERMS & PERSPECTIVE:
   - Reference epic characters in the 3rd person (e.g., "In the Ramayana, Rama faced...").
   - If you mention terms like "Dharma", explain it in 2-3 simple words.

4. LESSON & ACTION:
   - End with a clear, simple lesson learned from the story.
   - Give 1 or 2 small, practical steps the user can take today.

5. MEDICAL & HEALTH SAFETY (CRITICAL & MANDATORY):
   - You are a spiritual, philosophical, and epic mentor. You are NOT a medical doctor or healthcare professional.
   - If the user mentions any medical condition, physical/mental health symptoms, illness, doctors' prescriptions, medicines, dosages, or health routines:
     a) NEVER prescribe medicines, diagnose health conditions, or suggest changing/stopping any doctor-prescribed treatment, medicine, or routine.
     b) ALWAYS explicitly advise the user to consult a qualified medical doctor or healthcare professional for all medical and prescription decisions.
     c) You may ONLY offer emotional resilience, peace of mind, patience, and courage from the epics to support their well-being alongside professional care.
{lang_directive}
"""

        # Format conversation history if available
        history_str = ""
        if chat_history and len(chat_history) > 0:
            formatted_turns = []
            for turn in chat_history:
                role_label = (active_character if strict_character else "Epic Guide") if turn.get("role") == "assistant" else "Seeker (User)"
                content_val = turn.get("content", "").strip()
                if content_val:
                    formatted_turns.append(f"{role_label}: {content_val}")
            history_str = "\n".join(formatted_turns)

        if history_str:
            prompt = f"""
Conversation History:
{history_str}

Latest Message from Seeker: "{message}"

Retrieved Epic Context:
{context_str if context_str else "Draw upon core epic principles of Dharma, Svadharma, and your authentic lived experiences."}

Provide wise, direct 1st-person guidance as {active_character} to the seeker, taking into account the ongoing conversation history.
"""
        else:
            prompt = f"""
User's Modern Dilemma: "{message}"

Retrieved Epic Context:
{context_str if context_str else "Draw upon core epic principles of Dharma, Svadharma, and Nishkama Karma."}

Provide wise, actionable guidance to help the user resolve their dilemma.
"""

        # Log all parameters, prompt details, and characters
        retrieved_characters = list(set([s.character for s in sources if s.character]))
        print("\n" + "="*80)
        print("📋 [RAG LOG] REQUEST PARAMETERS & PROMPT DIAGNOSTICS")
        print("="*80)
        print(f"🔹 Parameters:")
        print(f"   • Message:          \"{message}\"")
        print(f"   • Active Character:  {active_character}")
        print(f"   • Requested Char:   {character}")
        print(f"   • Mode:             {mode}")
        print(f"   • Provider:         {provider or settings.DEFAULT_LLM_PROVIDER}")
        print(f"   • Strict Character: {strict_character}")
        print(f"   • History Turns:    {len(chat_history) if chat_history else 0}")
        print(f"   • Retrieved Chars:  {retrieved_characters if retrieved_characters else 'None'}")
        print("-" * 80)
        print(f"📜 [SYSTEM PROMPT]:\n{system_prompt.strip()}")
        print("-" * 80)
        print(f"💬 [USER PROMPT & CONTEXT]:\n{prompt.strip()}")
        print("="*80 + "\n")

        llm_res = LLMFactory.generate_response(prompt, system_prompt, provider)

        return {
            "reply": llm_res["reply"],
            "mode": mode,
            "character": active_character if not strict_character else character,
            "provider_used": llm_res["provider_used"],
            "sources": sources,
            "prompt_tokens": llm_res.get("prompt_tokens", 0),
            "completion_tokens": llm_res.get("completion_tokens", 0)
        }

    def _handle_knowledge_query(
        self,
        message: str,
        character: str,
        provider: str,
        language: str = "en"
    ) -> Dict[str, Any]:
        lang_directive = get_language_directive(language)
        system_prompt = f"""
You are an expert scholar of Ancient Indian Scriptures (Vedas, Upanishads, Bhagavad Gita, Ramayana, Mahabharata).
Answer the user's question clearly, factually, and accurately.
Keep your answer extremely crisp, concise, and under a strict maximum limit of 150 words.
{lang_directive}
"""
        prompt = f"User Question: {message}\nProvide a factual, scholarly answer based on ancient scriptures. Keep it under 150 words."
        llm_res = LLMFactory.generate_response(prompt, system_prompt, provider)

        return {
            "reply": llm_res["reply"],
            "mode": "knowledge",
            "character": character,
            "provider_used": llm_res["provider_used"],
            "sources": [],
            "prompt_tokens": llm_res.get("prompt_tokens", 0),
            "completion_tokens": llm_res.get("completion_tokens", 0)
        }

