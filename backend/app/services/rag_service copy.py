import json
import chromadb
from typing import Dict, Any, List
from app.config import settings
from app.services.llm_factory import LLMFactory
from app.models.schemas import SourceCitation

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
        character: str = "Krishna",
        provider: str = None
    ) -> Dict[str, Any]:
        """General RAG Query (POST /chat) - Searches across all epic scenarios."""
        if mode == "guidance":
            return self._handle_guidance_query(message, character, provider, mode=mode, strict_character=False)
        else:
            return self._handle_knowledge_query(message, character, provider)

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
        character: str,
        provider: str,
        mode: str = "guidance",
        strict_character: bool = False
    ) -> Dict[str, Any]:
        sources: List[SourceCitation] = []
        context_str = ""

        if self.scenarios_collection and self.scenarios_collection.count() > 0:
            try:
                print(f"\n🔍 [Vector DB] Querying ChromaDB (Embedder: all-MiniLM-L6-v2) | strict: {strict_character} | character: '{character}'")
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

                        sources.append(SourceCitation(
                            scenario_title=title,
                            epic=meta.get("epic", "Ramayana/Mahabharata"),
                            character=meta.get("protagonist", character),
                            verse_citations=[meta.get("verse_refs", "")],
                            summary_snippet=doc[:200]
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
You are a Wise Epic Scholar and Master Guide of the Indian Epics (Ramayana & Mahabharata).
Your role is to offer objective, profound, and practical guidance to the user's dilemma by drawing upon the most relevant stories, choices, and philosophical principles (Dharma) from the epics.

RULES:
1. Speak as a wise, neutral, and compassionate Epic Scholar.
2. Reference the retrieved epic stories and figures objectively in 3rd person (e.g., "In the Ramayana...", "In the Mahabharata...").
3. Translate ancient wisdom into crisp, actionable advice for the modern dilemma.
4. Keep your response extremely crisp, concise, and under a strict maximum limit of 150 words. Do not ramble.
"""

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
