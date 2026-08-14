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
        provider: str = None
    ) -> Dict[str, Any]:
        """General RAG Query (POST /chat) - Searches across all epic scenarios."""
        if mode == "guidance":
            return self._handle_guidance_query(message, character, provider, mode=mode, strict_character=False)
        else:
            return self._handle_knowledge_query(message, character or "Krishna", provider)

    def query_by_character(
        self,
        message: str,
        character: str = "Krishna",
        mode: str = "guidance",
        provider: str = None
    ) -> Dict[str, Any]:
        """Character-Strict RAG Query (POST /chat-character) - Filters scenarios strictly from character's own story."""
        return self._handle_guidance_query(message, character, provider, mode=mode, strict_character=True)

    def _handle_guidance_query(
        self,
        message: str,
        character: Optional[str] = None,
        provider: str = None,
        mode: str = "guidance",
        strict_character: bool = False
    ) -> Dict[str, Any]:
        sources: List[SourceCitation] = []
        context_str = ""

        if self.scenarios_collection and self.scenarios_collection.count() > 0:
            try:
                print(f"\n🔍 [Vector DB] Querying ChromaDB (Embedder: all-MiniLM-L6-v2) | strict: {strict_character} | character: '{character or 'None (Cross-Epic)'}'")
                query_kwargs = {"query_texts": [message], "n_results": 5}
                if strict_character and character:
                    query_kwargs["where"] = {"protagonist": character}

                results = self.scenarios_collection.query(**query_kwargs)

                # Fallback if strict filter yields 0 matches
                if strict_character and (not results or not results.get("documents") or not results["documents"][0]):
                    print(f"⚠️ [Vector DB] No cards found where protagonist='{character}', falling back to cross-epic search...")
                    query_kwargs.pop("where", None)
                    results = self.scenarios_collection.query(**query_kwargs)

                if results and results.get("documents"):
                    seen_titles = set()
                    for i, doc in enumerate(results["documents"][0]):
                        meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                        title = meta.get("title", "Epic Scenario")
                        
                        # Deduplicate by scenario title
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
                        context_str += f"\n--- SCENARIO {len(sources)} ---\nTitle: {title}\nEpic: {meta.get('epic')}\nSummary: {doc}\n"
                        
                        if len(sources) >= 3:
                            break

                    print(f"📦 [Vector DB] Retrieved {len(sources)} unique matching scenario card(s):")
                    for s in sources:
                        print(f"   ➔ [{s.epic}] {s.scenario_title} (Protagonist: {s.character})")
            except Exception as e:
                print(f"ChromaDB Query Warning: {e}")

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
4. Keep your response extremely crisp, concise, and under a strict maximum limit of 150 words. Do not ramble.
"""
        else:
            active_character = "Epic Scholar"
            system_prompt = f"""
            You are a Wise Epic Guide of the Indian Epics (Ramayana & Mahabharata).
Your role is to offer warm, wise, and practical help for the user's dilemma by sharing relevant stories and lessons from the epics.

RULES:

1. LANGUAGE & VOCABULARY (STRICT):
   - Use very simple, 6th-grade everyday English.
   - Do NOT use heavy, academic, or formal words (e.g., use "huge" instead of "insurmountable", "deep sadness" instead of "inconsolable grief", "ability" instead of "inherent resourcefulness").
   - Keep sentences short, clear, and easy to read.

2. STORYTELLING & EMPATHY:
   - First, reassure the user with warmth that they are not alone and others have faced similar hard times before.
   - Tell a story from the epics in simple words, explaining what happened to the character and how they solved or faced their problem. Do not assume the user knows the story.
   - Clearly connect that character's story to the user's current life situation.

3. SANSKRIT TERMS & PERSPECTIVE:
   - Reference epic characters in the 3rd person (e.g., "In the Ramayana, Rama faced...").
   - If you mention terms like "Dharma", explain it in 2-3 simple words (e.g., "Dharma (your duty to protect yourself)").

4. LESSON & ACTION:
   - End with a clear, simple lesson learned from the story.
   - Give 1 or 2 small, practical steps the user can take today.
"""
#             system_prompt = f"""
# You are a Wise Epic Scholar and Master Guide of the Indian Epics (Ramayana & Mahabharata).
# Your role is to offer objective, profound, and practical guidance to the user's dilemma by drawing upon the most relevant stories, choices, and philosophical principles (Dharma) from the epics.

# RULES:
# 1. Speak as a wise, neutral while maintaining a humanized tone in simple language.
# 2. Your response should be like a story that references/explains the events in the epic, how the characters resolved their issues/faced their problems and connect to the users current situation.
# 3. Reference the retrieved epic stories and figures objectively in 3rd person (e.g., "In the Ramayana...", "In the Mahabharata...").
# 4. Translate ancient wisdom into crisp, actionable advice for the modern dilemma.
# 5. In your response assure the user that they are not the first to face such  situtation (mention some popular characters from the epic who  faced similar  situations) and that many people have faced it before, then explain the situtation of the character in the epic while not assuming that the user knows the sotyr thus explaining the story to the user of what actual happened, then draw a similarity in users current situtation. Provide a lesson learned at the end. You can make up or infer details to make the story more compelling and humanizing, but the core philosophical lesson must remain true to the epic's teachings.
# """

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
            "sources": sources
        }

    def _handle_knowledge_query(
        self,
        message: str,
        character: str,
        provider: str
    ) -> Dict[str, Any]:
        system_prompt = """
You are an expert scholar of Ancient Indian Scriptures (Vedas, Upanishads, Bhagavad Gita, Ramayana, Mahabharata).
Answer the user's question clearly, factually, and accurately.
Keep your answer extremely crisp, concise, and under a strict maximum limit of 150 words.
"""
        prompt = f"User Question: {message}\nProvide a factual, scholarly answer based on ancient scriptures. Keep it under 150 words."
        llm_res = LLMFactory.generate_response(prompt, system_prompt, provider)

        return {
            "reply": llm_res["reply"],
            "mode": "knowledge",
            "character": character,
            "provider_used": llm_res["provider_used"],
            "sources": []
        }
