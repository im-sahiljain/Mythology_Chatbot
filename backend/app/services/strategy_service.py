from typing import Dict, Any, List
from app.config import settings
from app.services.rag_service import RAGService
from app.services.llm_factory import LLMFactory
from app.models.schemas import SourceCitation

class StrategyService:
    def __init__(self):
        self.rag_service = RAGService()

    # -------------------------------------------------------------
    # STRATEGY 1: Completeness Score (Adaptive AI Check)
    # -------------------------------------------------------------
    def process_completeness(self, message: str, provider: str = None) -> Dict[str, Any]:
        score = self._calculate_completeness_score(message)
        print(f"\n📊 [Strategy 1: Completeness] Calculated Score: {score:.2f} for message: '{message}'")

        if score < 0.70:
            dynamic_options = self._generate_dynamic_options(message, provider)
            return {
                "status": "needs_clarification",
                "completeness_score": round(score, 2),
                "reply": "To connect your dilemma to the exact epic story, please specify which situation best fits your struggle:",
                "options": dynamic_options,
                "provider_used": provider or settings.DEFAULT_LLM_PROVIDER,
                "sources": []
            }
        else:
            # Query ChromaDB and generate final guidance directly
            rag_res = self.rag_service.query(message=message, provider=provider)
            return {
                "status": "resolved",
                "completeness_score": round(score, 2),
                "reply": rag_res["reply"],
                "options": [],
                "provider_used": rag_res["provider_used"],
                "sources": rag_res["sources"]
            }

    def _generate_dynamic_options(self, message: str, provider: str = None) -> List[str]:
        system_prompt = "You are an expert AI categorizer. Respond with ONLY a JSON array of 3 strings."
        prompt = f"""
The user provided this dilemma query: "{message}"

Task: Generate 3 distinct, highly relevant clarification options (3-6 words each) that represent different root causes or specific angles of their problem.

Output format MUST be a valid JSON array of strings:
["Option 1", "Option 2", "Option 3"]
Output ONLY the JSON array.
"""
        try:
            res = LLMFactory.generate_response(prompt, system_prompt, provider)
            import json
            reply_clean = res["reply"].strip()
            if reply_clean.startswith("```"):
                reply_clean = reply_clean.split("```")[1].replace("json", "").strip()
            parsed = json.loads(reply_clean)
            if isinstance(parsed, list) and len(parsed) >= 3:
                return [str(o).strip() for o in parsed[:3]]
        except Exception as e:
            print(f"Dynamic Option Generator Warning: {e}")
            
        return [
            "Financial or Ethical Fraud",
            "Difference in Vision & Strategy",
            "Family or Relational Pressure"
        ]

    def _calculate_completeness_score(self, message: str) -> float:
        score = 0.0
        msg_lower = message.lower()
        words = msg_lower.split()

        # Length / Detail check
        if len(words) >= 12:
            score += 0.35
        elif len(words) >= 6:
            score += 0.20

        # Specific conflict keywords check
        conflict_keywords = [
            "money", "stole", "misus", "fraud", "favor", "nepotism", "lie",
            "cheat", "fire", "quit", "promot", "salary", "vision", "dispute",
            "burnout", "herit", "throne", "exile", "war", "loyal"
        ]
        if any(k in msg_lower for k in conflict_keywords):
            score += 0.40

        # Entity involved check
        entity_keywords = [
            "partner", "boss", "co-founder", "junior", "brother", "father",
            "manager", "employee", "founder", "relative", "cousin", "friend", "king"
        ]
        if any(e in msg_lower for e in entity_keywords):
            score += 0.25

        return min(score, 1.0)

    # -------------------------------------------------------------
    # STRATEGY 2: Structured Two-Turn Flow (Fixed Clarification Turn)
    # -------------------------------------------------------------
    def process_two_turn(self, message: str, turn: int, selected_option: str = None, provider: str = None) -> Dict[str, Any]:
        print(f"\n🔄 [Strategy 2: Two-Turn] Turn: {turn} | Selected Option: '{selected_option}'")

        if turn == 1:
            dynamic_options = self._generate_dynamic_options(message, provider)
            return {
                "turn": 1,
                "reply": "I hear your heavy heart. To give you the exact story from the epics, which situation best describes your conflict?",
                "options": dynamic_options,
                "sources": []
            }
        else:
            # Combine initial message + selected option for ChromaDB search
            full_context = f"{message}. Specific context: {selected_option or 'Ethical dispute'}"
            rag_res = self.rag_service.query(message=full_context, provider=provider)
            return {
                "turn": 2,
                "reply": rag_res["reply"],
                "options": [],
                "sources": rag_res["sources"]
            }

    # -------------------------------------------------------------
    # STRATEGY 3: Progressive Hybrid Search (Always Match & Ask)
    # -------------------------------------------------------------
    def process_progressive(self, message: str, chat_history: List[Dict[str, str]], provider: str = None) -> Dict[str, Any]:
        print(f"\n📈 [Strategy 3: Progressive] Processing turn with history length: {len(chat_history)}")
        
        # Combine previous conversation history + new follow-up answer for RAG search
        if chat_history:
            history_text = "\n".join([f"{turn.get('role', 'user')}: {turn.get('content', '')}" for turn in chat_history])
            combined_message = f"Previous Conversation Context:\n{history_text}\n\nLatest Follow-up Answer: {message}"
        else:
            combined_message = message

        rag_res = self.rag_service.query(message=combined_message, provider=provider)
        
        reply = rag_res["reply"]
        # Append follow-up question only on Turn 1 (when history is empty)
        if not chat_history:
            reply += "\n\nDoes this epic perspective resonate with your situation, or is there a specific aspect you would like to explore deeper?"

        return {
            "reply": reply,
            "sources": rag_res["sources"]
        }

    # -------------------------------------------------------------
    # STRATEGY 4: Autonomous Socratic Interviewer Engine
    # -------------------------------------------------------------
    def process_socratic(self, message: str, chat_history: List[Dict[str, str]], force_resolve: bool = False, provider: str = None) -> Dict[str, Any]:
        print(f"\n🔮 [Strategy 4: Socratic Interviewer] Processing turn with history length: {len(chat_history)} | force_resolve: {force_resolve}")
        
        history_text = ""
        if chat_history:
            history_text = "CONVERSATION HISTORY:\n" + "\n".join([f"{t.get('role', 'user')}: {t.get('content', '')}" for t in chat_history]) + "\n\n"
        
        combined_text = f"{history_text}Latest User Input: {message}"
        
        # Turn count check (1 turn = user + assistant pair, so length 4 = 2 completed turns)
        turn_number = (len(chat_history) // 2) + 1
        
        # Check force_resolve OR Safety Brake (Turn >= 3) OR LLM evaluation
        if force_resolve:
            print("   ⚡ [Manual Override] User requested immediate resolution!")
            is_sufficient = True
        elif turn_number >= 3:
            print("   🛡️ [Safety Brake] Turn limit reached (Turn 3+). Forcing final epic resolution!")
            is_sufficient = True
        else:
            is_sufficient = self._evaluate_context_sufficiency(combined_text, turn_number, provider)

        print(f"   ➔ Context Sufficiency Evaluated: {'SUFFICIENT (RESOLVING)' if is_sufficient else 'INSUFFICIENT (INTERVIEWING)'}")

        if not is_sufficient:
            system_prompt = """
You are a wise, empathetic Master Counselor inspired by the Indian Epics (Ramayana & Mahabharata).
Your task is to understand the user's dilemma deeply before giving any final advice.

RULES:
1. Do NOT give final advice or scripture citations yet.
2. Empathetically acknowledge their situation in 1 sentence.
3. Ask 1 deep, targeted Socratic question to uncover the underlying cause (e.g. money vs values, silence vs confrontation, fear vs duty).
4. Keep your question natural, warm, and under 60 words.
"""
            prompt = f"{combined_text}\n\nAsk 1 deep Socratic question to understand their dilemma better:"

            print("\n" + "="*80)
            print("🔮 [SOCRATIC LOG] SOCRATIC INTERVIEWER GENERATION (INTERVIEWING MODE)")
            print("="*80)
            print(f"🔹 Evaluator Verdict:  INSUFFICIENT CONTEXT -> Asking Socratic Counter-Question")
            print(f"   • Generator Role:    Socratic Master Counselor (LLM)")
            print(f"   • Turn Number:       {turn_number}")
            print(f"   • Provider:          {provider or settings.DEFAULT_LLM_PROVIDER}")
            print(f"   • Force Resolve:     {force_resolve}")
            print("-" * 80)
            print(f"📜 [SYSTEM PROMPT]:\n{system_prompt.strip()}")
            print("-" * 80)
            print(f"💬 [USER PROMPT TO LLM]:\n{prompt.strip()}")
            print("="*80 + "\n")

            llm_res = LLMFactory.generate_response(prompt, system_prompt, provider)

            print(f"❓ [SOCRATIC GENERATED COUNTER-QUESTION]:\n{llm_res['reply'].strip()}\n")

            return {
                "status": "interviewing",
                "reply": llm_res["reply"],
                "character": "Epic Counselor",
                "provider_used": llm_res["provider_used"],
                "sources": []
            }
        else:
            print("\n" + "="*80)
            print("🔮 [SOCRATIC LOG] FINAL COUNSEL GENERATION (RESOLVED MODE)")
            print("="*80)
            print(f"🔹 Evaluator Verdict:  SUFFICIENT CONTEXT -> Fetching Vector DB & Generating Final Counsel")
            print(f"   • Generator Role:    Universal Epic Scholar (LLM + Vector RAG)")
            print(f"   • Turn Number:       {turn_number}")
            print(f"   • Provider:          {provider or settings.DEFAULT_LLM_PROVIDER}")
            print("="*80 + "\n")

            rag_res = self.rag_service.query(message=combined_text, provider=provider)
            return {
                "status": "resolved",
                "reply": f"✨ **Final Epic Counsel**\n\n{rag_res['reply']}",
                "character": rag_res.get("character", "Epic Scholar"),
                "provider_used": rag_res["provider_used"],
                "sources": rag_res["sources"]
            }

    def _evaluate_context_sufficiency(self, full_text: str, turn_count: int, provider: str = None) -> bool:
        eval_system_prompt = "You are an AI evaluator. Respond with ONLY 'YES' or 'NO'."
        eval_prompt = f"""
Analyze this user's conversation thread about their personal/workplace dilemma:

{full_text}

Task: Has the user provided SUFFICIENT context (specific conflict, key people involved, underlying causes, and emotional/financial stakes) to allow an epic counselor to deliver a definitive, hyper-personalized final judgment?

Rules:
- Respond 'YES' ONLY if the user has explained the specific problem, people involved, and what choice they are facing.
- Respond 'NO' if the problem is still broad, vague, or missing crucial details.
- Output ONLY the single word YES or NO.
"""
        try:
            res = LLMFactory.generate_response(eval_prompt, eval_system_prompt, provider)
            reply_clean = res["reply"].strip().upper()
            print(f"   🤖 [LLM Sufficiency Evaluator] Verdict: '{reply_clean}' for turn {turn_count}")
            return "YES" in reply_clean
        except Exception as e:
            print(f"Sufficiency Evaluator Warning: {e}")
            return turn_count >= 3

    # -------------------------------------------------------------
    # STRATEGY 5: Full Chat (Continuous Memory + Socratic + Follow-up RAG)
    # -------------------------------------------------------------
    def process_full_chat(
        self,
        message: str,
        chat_history: List[Dict[str, Any]],
        force_resolve: bool = False,
        session_id: str = None,
        provider: str = None
    ) -> Dict[str, Any]:
        """
        Stateful interactive chat with complete memory:
        1. Interviewing Stage: Asks natural text clarifying questions until context is clear.
        2. Resolved Stage: Delivers Final Epic Counsel with scripture cards.
        3. Follow-Up Stage: Continuous conversation answering user questions, dynamically deciding
           whether to query vector DB for new stories or answer directly from conversation memory!
        """
        print("\n" + "="*80)
        print("🧠 [FULL CHAT LOG] INCOMING CHAT HISTORY & USER MESSAGE")
        print("="*80)
        print(f"🔹 Latest User Message: \"{message}\"")
        print(f"🔹 Total History Turns: {len(chat_history)}")
        print(f"🔹 History Payload (ChatMessage[]):")
        if chat_history:
            for i, h in enumerate(chat_history):
                role_icon = "👤" if h.get("role") == "user" else "🤖"
                preview = h.get("content", "")[:120].replace("\n", " ")
                print(f"   [{i+1}] {role_icon} {h.get('role', 'user').upper()}: {preview}...")
        else:
            print("   (Empty - Initial First Turn)")
        print("="*80 + "\n")

        # Check if Final Epic Counsel has already been delivered in history
        already_resolved = any(
            t.get("role") == "assistant" and ("Final Epic Counsel" in t.get("content", "") or "✨" in t.get("content", ""))
            for t in chat_history
        )

        history_text = ""
        if chat_history:
            history_text = "CONVERSATION HISTORY:\n" + "\n".join([f"{t.get('role', 'user')}: {t.get('content', '')}" for t in chat_history]) + "\n\n"

        combined_text = f"{history_text}Latest User Input: {message}"

        # -------------------------------------------------------------
        # CASE A: POST-COUNSEL FOLLOW-UP MODE (Counsel already delivered)
        # -------------------------------------------------------------
        if already_resolved:
            print("   💬 [Full Chat] Active State: FOLLOW_UP MODE (Continuous Chat)")
            needs_search, search_query = self._decide_followup_search(message, history_text, provider)

            sources = []
            context_str = ""

            if needs_search:
                print(f"   🔍 [Full Chat Tool Call] Vector Search TRIGGERED for: '{search_query}'")
                rag_res = self.rag_service.query(message=search_query, provider=provider)
                sources = rag_res.get("sources", [])
                context_str = "\n".join([f"Scenario: {s.scenario_title} ({s.epic}) - {s.summary_snippet}" for s in sources])
            else:
                print(f"   ⚡ [Full Chat Direct Answer] Answering directly from conversation memory (No vector search needed)")

            followup_system_prompt = """
You are a Wise Epic Mentor continuing a deep conversation with a user who has already received your Final Epic Counsel.
Your task is to answer their follow-up questions with warmth, wisdom, and complete conversational continuity.

RULES:
1. LANGUAGE: Use simple, everyday 6th-grade English. Keep sentences clear, short, and warm.
2. CONTINUITY: Maintain full awareness of the conversation history and your previous advice.
3. REASONING: If the user asks why you made a judgment or compared them to a character, explain your reasoning simply.
4. EXPLAINING EPICS: If new scripture context is provided, weave the story lessons naturally into your answer.
5. SANSKRIT TERMS: If you mention words like 'Dharma' or 'Karma', explain them in 2-3 simple words.
"""
            scripture_section = f"Newly Retrieved Scripture Context:\n{context_str}" if context_str else "Answer directly using the established conversation context."
            followup_prompt = f"""
{history_text}
Latest User Follow-Up Question: "{message}"

{scripture_section}

Provide a wise, simple, and direct follow-up response:
"""
            llm_res = LLMFactory.generate_response(followup_prompt, followup_system_prompt, provider)

            return {
                "stage": "follow_up",
                "reply": llm_res["reply"],
                "character": "Epic Mentor",
                "sources": sources,
                "searched_vector_db": needs_search,
                "provider_used": llm_res["provider_used"]
            }

        # -------------------------------------------------------------
        # CASE B: INITIAL INTERVIEW / RESOLUTION STAGE
        # -------------------------------------------------------------
        turn_number = (len(chat_history) // 2) + 1

        if force_resolve:
            print("   ⚡ [Full Chat] Manual override: Forcing final counsel immediately!")
            is_sufficient = True
        elif turn_number >= 3:
            print("   🛡️ [Full Chat] Turn limit reached (Turn 3+). Forcing final counsel!")
            is_sufficient = True
        else:
            is_sufficient = self._evaluate_context_sufficiency(combined_text, turn_number, provider)

        print(f"   ➔ Context Sufficiency: {'SUFFICIENT (Delivering Counsel)' if is_sufficient else 'INSUFFICIENT (Asking Socratic Q)'}")

        if not is_sufficient:
            # Socratic Interview Question (Pure text, no chips)
            interview_system_prompt = """
You are a wise, empathetic Master Counselor inspired by the Indian Epics (Ramayana & Mahabharata).
Your task is to understand the user's dilemma deeply before giving any final advice.

RULES:
1. Do NOT give final advice or scripture citations yet.
2. Empathetically acknowledge their situation in 1 simple sentence.
3. Ask 1 deep, targeted Socratic question in natural, simple English to uncover the root cause or personal stakes.
4. Use 6th-grade simple English. Keep your question warm, clear, and under 50 words.
"""
            interview_prompt = f"{combined_text}\n\nAsk 1 deep, simple Socratic question to understand their dilemma better:"
            llm_res = LLMFactory.generate_response(interview_prompt, interview_system_prompt, provider)

            return {
                "stage": "interviewing",
                "reply": llm_res["reply"],
                "character": "Epic Counselor",
                "sources": [],
                "searched_vector_db": False,
                "provider_used": llm_res["provider_used"]
            }
        else:
            # Generate Final Epic Counsel with ChromaDB RAG
            rag_res = self.rag_service.query(message=combined_text, provider=provider)
            return {
                "stage": "resolved",
                "reply": f"✨ **Final Epic Counsel**\n\n{rag_res['reply']}",
                "character": rag_res.get("character", "Epic Scholar"),
                "sources": rag_res.get("sources", []),
                "searched_vector_db": True,
                "provider_used": rag_res["provider_used"]
            }

    def _decide_followup_search(self, user_message: str, history_text: str, provider: str = None) -> tuple[bool, str]:
        """
        Lightweight LLM decision router:
        Determines whether the follow-up asks for new scripture/character knowledge (requires vector search)
        or is a direct question/clarification about prior conversation (direct answer).
        """
        router_system_prompt = "You are an intelligent query router for a mythology RAG system. Output ONLY valid JSON."
        router_prompt = f"""
Conversation History snippet:
{history_text[-800:] if len(history_text) > 800 else history_text}

Latest User Message: "{user_message}"

Task:
1. Does the user ask for NEW stories, DIFFERENT characters, or SPECIFIC scripture knowledge from Ramayana/Mahabharata that needs database search?
2. If YES: generate a clean, standalone search query (3-6 words).
3. If NO (e.g. asking "why did you say that", "explain step 2", "can you summarize", general reaction): set needs_search to false.

Output ONLY JSON in this format:
{{"needs_search": true, "search_query": "Karna loyalty in Kurukshetra"}}
OR
{{"needs_search": false, "search_query": ""}}
"""
        try:
            res = LLMFactory.generate_response(router_prompt, router_system_prompt, provider)
            import json
            clean_reply = res["reply"].strip()
            if clean_reply.startswith("```"):
                clean_reply = clean_reply.split("```")[1].replace("json", "").strip()
            data = json.loads(clean_reply)
            return bool(data.get("needs_search", False)), str(data.get("search_query", user_message))
        except Exception as e:
            print(f"Router Warning: {e}")
            return False, user_message

    # -------------------------------------------------------------
    # STRATEGY 6: Character-Strict Socratic Multi-Turn Chat
    # -------------------------------------------------------------
    def process_character_socratic_chat(
        self,
        message: str,
        character: str,
        chat_history: List[Dict[str, Any]],
        force_resolve: bool = False,
        session_id: str = None,
        provider: str = None
    ) -> Dict[str, Any]:
        """
        1st-Person Character-Strict Socratic Chat with complete memory:
        1. Interviewing Stage (Turns 1-2): Character asks 1st-person probing Socratic question to uncover root dilemma.
        2. Resolved Stage (Turn 3+ or Context Sufficient): Delivers Final 1st-Person Counsel with ChromaDB cards filtered by protagonist.
        3. Follow-Up Stage: Continuous conversation answering in authentic 1st-person persona.
        """
        active_char = character or "Krishna"
        print("\n" + "="*80)
        print(f"👑 [CHARACTER SOCRATIC LOG] Persona: {active_char} | History Turns: {len(chat_history)} | Force: {force_resolve}")
        print("="*80)

        # Check if Final Epic Counsel has already been delivered in history
        already_resolved = any(
            t.get("role") == "assistant" and ("Final Counsel from" in t.get("content", "") or "✨" in t.get("content", "") or "Final Epic Counsel" in t.get("content", ""))
            for t in chat_history
        )

        history_text = ""
        if chat_history:
            history_text = "CONVERSATION HISTORY:\n" + "\n".join([f"{t.get('role', 'user')}: {t.get('content', '')}" for t in chat_history]) + "\n\n"

        combined_text = f"{history_text}Latest User Input: {message}"

        # -------------------------------------------------------------
        # CASE A: POST-COUNSEL FOLLOW-UP MODE
        # -------------------------------------------------------------
        if already_resolved:
            print(f"   💬 [Character Socratic] Active State: FOLLOW_UP MODE with {active_char}")
            needs_search, search_query = self._decide_followup_search(message, history_text, provider)

            sources = []
            context_str = ""
            if needs_search:
                print(f"   🔍 [Character Tool Call] Vector Search TRIGGERED for '{search_query}' (protagonist: {active_char})")
                rag_res = self.rag_service.query_by_character(
                    message=search_query,
                    character=active_char,
                    provider=provider,
                    chat_history=chat_history
                )
                sources = rag_res.get("sources", [])
                context_str = "\n".join([f"Scenario: {s.scenario_title} ({s.epic}) - {s.summary_snippet}" for s in sources])

            followup_system_prompt = f"""
You are {active_char} from the Indian Epics. You are in deep, 1st-person conversation with a seeker who has already received your primary counsel.
Answer their follow-up thoughts, questions, or doubts with authentic 1st-person wisdom drawn from your own life and principles.

RULES:
1. Speak exclusively in 1st person as {active_char}.
2. Maintain full awareness of what the seeker has shared across all prior turns.
3. Keep your response clear, warm, and under 150 words.
"""
            scripture_section = f"Retrieved Character Memories/Stories:\n{context_str}" if context_str else "Respond directly from your persona and conversation memory."
            followup_prompt = f"""
{history_text}
Latest Question from Seeker: "{message}"

{scripture_section}

Provide your 1st-person response as {active_char}:
"""
            llm_res = LLMFactory.generate_response(followup_prompt, followup_system_prompt, provider)

            return {
                "stage": "follow_up",
                "mode": "guidance",
                "reply": llm_res["reply"],
                "character": active_char,
                "sources": sources,
                "searched_vector_db": needs_search,
                "provider_used": llm_res["provider_used"]
            }

        # -------------------------------------------------------------
        # CASE B: INITIAL INTERVIEW / RESOLUTION STAGE
        # -------------------------------------------------------------
        user_turn_count = len([t for t in chat_history if t.get("role") == "user"]) + 1

        if force_resolve:
            print("   ⚡ [Character Socratic] Manual override: Forcing final counsel immediately!")
            is_sufficient = True
        elif user_turn_count >= 3:
            print(f"   🛡️ [Character Socratic] Safety Brake: Turn {user_turn_count} reached. Forcing final counsel!")
            is_sufficient = True
        else:
            is_sufficient = self._evaluate_context_sufficiency(combined_text, user_turn_count, provider)

        print(f"   ➔ Context Sufficiency: {'SUFFICIENT (Delivering Final Counsel)' if is_sufficient else 'INSUFFICIENT (Asking Socratic Q)'}")

        if not is_sufficient:
            interview_system_prompt = f"""
You are {active_char}. A seeker has approached you for guidance with a personal dilemma.
Before revealing your definitive judgment and the lessons from your own life, you must understand their circumstance more deeply.

RULES:
1. Speak strictly in the 1st-person voice and authentic persona of {active_char}.
2. In 1 warm sentence, acknowledge their struggle.
3. Ask 1 deep, targeted Socratic question in your voice to uncover the root cause, hidden motivations, or emotional stakes (e.g. duty vs attachment, fear vs truth).
4. Do NOT deliver your final advice or scripture citations yet.
5. Keep your response under 55 words.
"""
            interview_prompt = f"{combined_text}\n\nAs {active_char}, ask 1 deep Socratic question to understand the seeker's dilemma better:"
            llm_res = LLMFactory.generate_response(interview_prompt, interview_system_prompt, provider)

            return {
                "stage": "interviewing",
                "mode": "guidance",
                "reply": llm_res["reply"],
                "character": active_char,
                "sources": [],
                "searched_vector_db": False,
                "provider_used": llm_res["provider_used"]
            }
        else:
            # Generate Final 1st-Person Epic Counsel using ChromaDB with strict character filter
            rag_res = self.rag_service.query_by_character(
                message=combined_text,
                character=active_char,
                provider=provider,
                chat_history=chat_history
            )
            return {
                "stage": "resolved",
                "mode": "guidance",
                "reply": f"✨ **Final Counsel from {active_char}**\n\n{rag_res['reply']}",
                "character": active_char,
                "sources": rag_res.get("sources", []),
                "searched_vector_db": True,
                "provider_used": rag_res["provider_used"]
            }

    # -------------------------------------------------------------
    # STRATEGY 7: User-Controlled Multi-Legend Council (Roundtable)
    # -------------------------------------------------------------
    def process_roundtable_chat(
        self,
        message: str,
        council_characters: List[str],
        muted_characters: List[str] = None,
        chat_history: List[Dict[str, Any]] = None,
        force_resolve: bool = False,
        session_id: str = None,
        provider: str = None
    ) -> Dict[str, Any]:
        """
        Multi-agent collaborative council (Vedic Sabha) with 3-Stage Lifecycle:
        - Stage 1 ('interviewing'): Lead legend asks a probing question to build user context (0 vector searches).
        - Stage 2 ('resolved'): Full resolution with scripture scenario cards once context is sufficient or force_resolve is True.
        - Stage 3 ('follow_up'): Continuous discussion using Gemini Query Router to skip vector search on reaction/opinion follow-ups.
        """
        ALL_CHARACTERS = ["Krishna", "Sita", "Rama", "Arjuna", "Bhishma", "Karna", "Vibhishana", "Drona", "Sugriva"]
        active_council = list(council_characters) if council_characters else ["Sita", "Krishna"]
        muted = list(muted_characters) if muted_characters else []
        history = list(chat_history) if chat_history else []

        print("\n" + "="*80)
        print(f"🪷 [ROUNDTABLE COUNCIL LOG] Active Council: {active_council} | Muted: {muted} | Force Resolve: {force_resolve}")
        print(f"🔹 User Message: \"{message}\"")
        print("="*80)

        replies = []
        msg_lower = message.lower()

        # 1. Detect dynamic invites via @mention or natural language
        for char in ALL_CHARACTERS:
            if char not in active_council:
                if f"@{char.lower()}" in msg_lower or f"invite {char.lower()}" in msg_lower or f"call {char.lower()}" in msg_lower:
                    active_council.append(char)
                    print(f"   ➕ [Council] Added {char} to active council")

        # 2. Detect dismissals ("leave", "dismiss", "exit", "shut")
        dismissed_chars = []
        for char in list(active_council):
            char_l = char.lower()
            if (f"{char_l} leave" in msg_lower or f"dismiss {char_l}" in msg_lower or
                f"{char_l} exit" in msg_lower or f"bye {char_l}" in msg_lower or f"remove {char_l}" in msg_lower):
                dismissed_chars.append(char)
                active_council.remove(char)
                print(f"   🚪 [Council] {char} departing council")
                replies.append({
                    "character": char,
                    "action": "depart",
                    "content": f"May righteousness guide your path, seeker. I take my leave from the council.",
                    "sources": [],
                    "stage": "follow_up"
                })

        # 3. Determine targeted speakers
        import re
        explicit_candidates = []
        for char in active_council:
            if char in muted:
                continue
            char_l = char.lower()
            at_matched = f"@{char_l}" in msg_lower
            vocative_matched = bool(
                re.search(rf"(^|\bhey\s+|\bask\s+|\btell\s+|\bhear\s+)\b{re.escape(char_l)}\b([,\s:]|$)", msg_lower)
            )

            if at_matched or vocative_matched:
                is_referenced_subject = bool(
                    re.search(rf"(@?{re.escape(char_l)})\s+(said|spoke|advised|told|mentioned|did|chose|faced|taught)\b", msg_lower)
                ) or bool(
                    re.search(rf"\b(about|on|regarding|like|to)\s+@?{re.escape(char_l)}\b", msg_lower)
                )
                if not is_referenced_subject:
                    explicit_candidates.append(char)

        if explicit_candidates:
            targeted_speakers = explicit_candidates
        else:
            all_at_chars = [c for c in active_council if c not in muted and f"@{c.lower()}" in msg_lower]
            if all_at_chars:
                targeted_speakers = [all_at_chars[0]]
            else:
                targeted_speakers = [c for c in active_council if c not in muted]

        targeted_speakers = [c for c in targeted_speakers if c not in muted]

        if not targeted_speakers:
            print("   🔇 [Council] All targeted speakers are muted. Returning muted council notice.")
            return {
                "replies": [{
                    "character": "Council",
                    "action": "speak",
                    "content": "All members in your active council are currently muted. Tap the mute icon 🔇 on a legend to unmute them and receive their guidance.",
                    "sources": [],
                    "stage": "follow_up"
                }],
                "active_council": active_council,
                "muted_council": muted,
                "stage": "follow_up",
                "provider_used": provider or settings.DEFAULT_LLM_PROVIDER
            }

        # 4. Format shared history text
        history_lines = []
        for turn in history:
            role = turn.get("role", "user")
            speaker_name = turn.get("character", "User" if role == "user" else "Guide")
            content = turn.get("content", "").strip()
            history_lines.append(f"{speaker_name}: {content}")
        history_text = "\n".join(history_lines)

        # 5. Evaluate Stage & Context Sufficiency
        already_resolved = any(
            t.get("role") == "assistant" and (t.get("stage") == "resolved" or t.get("sources"))
            for t in history
        )
        user_turn_count = len([h for h in history if h.get("role") == "user"]) + 1

        if already_resolved:
            current_stage = "follow_up"
        elif force_resolve:
            print("   ⚡ [Manual Override] Force resolve requested for Roundtable Council!")
            current_stage = "resolved"
        elif user_turn_count >= 3:
            print("   🛡️ [Safety Brake] Turn limit reached (Turn 3+). Resolving Council Counsel!")
            current_stage = "resolved"
        else:
            full_user_text = " ".join([h.get("content", "") for h in history if h.get("role") == "user"] + [message])
            is_sufficient = self._evaluate_context_sufficiency(full_user_text, user_turn_count, provider)
            if is_sufficient:
                current_stage = "resolved"
            else:
                current_stage = "interviewing"

        print(f"   📊 [Roundtable Stage Verdict]: '{current_stage}' (Turn {user_turn_count})")

        current_turn_spoken_text = ""
        last_provider = provider or settings.DEFAULT_LLM_PROVIDER

        # -------------------------------------------------------------
        # STAGE 1: INTERVIEWING (Context-Building)
        # -------------------------------------------------------------
        if current_stage == "interviewing":
            lead_speaker = explicit_candidates[0] if explicit_candidates else targeted_speakers[0]
            print(f"   ❓ [Council Interviewing] Lead Inquirer selected: {lead_speaker}")

            other_council_members = [c for c in active_council if c != lead_speaker]
            council_context_str = f"Fellow Council Members present: {', '.join(other_council_members)}" if other_council_members else "You are the sole counselor."

            interview_system_prompt = f"""
You are {lead_speaker} in the Council of Legends (Vedic Sabha).
{council_context_str}

The seeker has shared an initial problem. Your task is NOT to give final scripture counsel or quotes yet.
Instead, ask ONE warm, probing 1st-person question from your epic perspective to help uncover their root dilemma, key relationships, or underlying choices.

RULES:
1. LANGUAGE & TONE: Use simple, clear, everyday 6th-grade English. Keep your tone warm, empathetic, and approachable. Avoid grandiloquent, archaic, or complex words.
2. 1ST PERSON PERSPECTIVE: Speak in 1st person as {lead_speaker}.
3. 1 CONCISE QUESTION: Ask ONLY 1 concise probing question (under 45 words).
4. NO FINAL COUNSEL: Do not quote scripture or give final resolutions yet.
"""
            interview_prompt = f"""
SHARED CONVERSATION HISTORY:
{history_text if history_text else "(Beginning of Council Consultation)"}

LATEST SEEKER MESSAGE:
"{message}"

Ask your 1st-person probing question as {lead_speaker}:
"""
            llm_res = LLMFactory.generate_response(interview_prompt, interview_system_prompt, provider)
            reply_text = llm_res["reply"].strip()

            replies.append({
                "character": lead_speaker,
                "action": "speak",
                "content": reply_text,
                "sources": [],
                "stage": "interviewing"
            })

            return {
                "replies": replies,
                "active_council": active_council,
                "muted_council": muted,
                "stage": "interviewing",
                "provider_used": llm_res["provider_used"]
            }

        # -------------------------------------------------------------
        # STAGE 3: FOLLOW_UP MODE (Decision Router)
        # -------------------------------------------------------------
        needs_search = True
        search_query = message
        if current_stage == "follow_up":
            needs_search, search_query = self._decide_followup_search(message, history_text, provider)
            print(f"   🤔 [Council Router] Needs Search: {needs_search} | Query: '{search_query}'")

        # -------------------------------------------------------------
        # STAGE 2 & STAGE 3 GENERATION FOR TARGETED SPEAKERS
        # -------------------------------------------------------------
        combined_user_text = " ".join([h.get("content", "") for h in history if h.get("role") == "user"] + [message])

        for speaker in targeted_speakers:
            print(f"   🤖 Generating response for: {speaker} (Stage: {current_stage})")

            sources = []
            stories_context = ""

            if current_stage == "resolved" or (current_stage == "follow_up" and needs_search):
                query_text = combined_user_text if current_stage == "resolved" else search_query
                print(f"   🔍 [Council Vector Search] Character: {speaker} | Query: '{query_text[:60]}...'")
                rag_res = self.rag_service.query_by_character(
                    message=query_text,
                    character=speaker,
                    provider=provider,
                    chat_history=history
                )
                sources = rag_res.get("sources", [])
                stories_context = "\n".join([f"Scenario: {s.scenario_title} ({s.epic}) - {s.summary_snippet}" for s in sources])
            else:
                print(f"   ⚡ [Council Memory Answer] {speaker} answering directly from conversation memory")

            other_council_members = [c for c in active_council if c != speaker]
            council_context_str = f"Fellow Council Members present: {', '.join(other_council_members)}" if other_council_members else "You are the sole counselor."

            system_prompt = f"""
You are {speaker} in the Council of Legends (Vedic Sabha).
{council_context_str}

You are in live 1st-person conversation with the seeker.

RULES:
1. LANGUAGE & TONE: Use simple, clear, everyday 6th-grade English. Keep your tone warm, empathetic, and approachable. Avoid grandiloquent, archaic, or overly complex vocabulary.
2. 1ST PERSON PERSPECTIVE: Speak strictly in 1st person as {speaker} ("I", "my life", "my duty", "in my struggle").
3. SANSKRIT TERMS: If you use terms like 'Dharma' or 'Karma', explain them in 2-3 simple words.
4. DRAW FROM EPICS: Draw directly from your personal epic memories, decisions, and lived philosophy.
5. MUTUAL AWARENESS: If fellow legends have already spoken earlier or in this turn, you may warmly acknowledge, build upon, or respectfully contrast their viewpoint.
6. CRISP & IMPACTFUL: Offer practical wisdom for the seeker's situation in short, clear sentences under 110 words.
"""
            prior_turn_speech = f"WORDS SPOKEN IN THIS TURN BY FELLOW COUNCIL MEMBERS:\n{current_turn_spoken_text}" if current_turn_spoken_text else ""
            prompt = f"""
SHARED CONVERSATION HISTORY:
{history_text if history_text else "(Beginning of Council Consultation)"}

LATEST SEEKER MESSAGE:
"{message}"

{prior_turn_speech}

YOUR RETRIEVED EPIC STORIES / MEMORIES:
{stories_context if stories_context else "Draw from your core principles of Dharma, Svadharma, and lived choices."}

Provide your 1st-person response as {speaker}:
"""
            llm_res = LLMFactory.generate_response(prompt, system_prompt, provider)
            speaker_reply_text = llm_res["reply"].strip()
            last_provider = llm_res["provider_used"]

            replies.append({
                "character": speaker,
                "action": "speak",
                "content": speaker_reply_text,
                "sources": sources,
                "stage": current_stage
            })

            current_turn_spoken_text += f"\n[{speaker}]: {speaker_reply_text}\n"

        return {
            "replies": replies,
            "active_council": active_council,
            "muted_council": muted,
            "stage": current_stage,
            "provider_used": last_provider
        }

