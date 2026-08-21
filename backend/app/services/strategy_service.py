from typing import Dict, Any, List
from app.config import settings
from app.services.rag_service import RAGService, get_language_directive
from app.services.llm_factory import LLMFactory
from app.models.schemas import SourceCitation

def get_counsel_heading(language: str = "en", character: str = None) -> str:
    lang = (language or "en").lower().strip()
    if character:
        headers = {
            "hi": f"✨ **{character} से अंतिम मार्गदर्शन**",
            "sa": f"✨ **{character}-मुखात् अन्तिमपरामर्शः**",
            "ta": f"✨ **{character} இன் இறுதி ஆலோசனை**",
            "te": f"✨ **{character} నుండి తుది ఇతిహాస సలహా**",
            "bn": f"✨ **{character}-এর চূড়ান্ত পরামর্শ**",
            "mr": f"✨ **{character} यांचे अंतिम मार्गदर्शन**",
            "gu": f"✨ **{character} તરફથી અંતિમ પરામર્શ**",
            "kn": f"✨ **{character} ರವರ ಅಂತಿಮ ಮಾರ್ಗದರ್ಶನ**",
            "ml": f"✨ **{character} ൽ നിന്നുള്ള അന്തിമ ഉപദേശം**",
            "pa": f"✨ **{character} ਵੱਲੋਂ ਅੰਤਿਮ ਸਲਾਹ**",
            "or": f"✨ **{character}ଙ୍କ ଠାରୁ ଚୂଡ଼ାନ୍ତ ପରାମର୍ଶ**",
            "as": f"✨ **{character}ৰ পৰা চূড়ান্ত পৰামৰ্শ**",
            "ur": f"✨ **{character} کی جانب سے حتمی رہنمائی**",
            "mai": f"✨ **{character} सँ अंतिम मार्गदर्शन**",
            "ne": f"✨ **{character} बाट अन्तिम मार्गदर्शन**",
            "kok": f"✨ **{character} कडल्यान निमाणो सल्लो**",
            "doi": f"✨ **{character} थमां अंतिम सलाह**",
            "ks": f"✨ **{character} کی طرفٕہ حتمی مشورہ**",
            "sd": f"✨ **{character} پاران حتمي صلاح**",
            "mni": f"✨ **{character} দগী অরোইবা পাউতাক**",
            "brx": f"✨ **{character} निफ्राय जोबथा सुबुंथि**",
            "sat": f"✨ **{character} ᱴᱷᱮᱱ ᱠᱷᱚᱱ ᱢᱩᱪᱟᱹᱫ ᱫᱤᱥᱟᱹ**",
        }
        return headers.get(lang, f"✨ **Final Counsel from {character}**")
    else:
        headers = {
            "hi": "✨ **अंतिम महाकाव्य परामर्श**",
            "sa": "✨ **अन्तिममहाकाव्यपरामर्शः**",
            "ta": "✨ **இறுதி இதிகாச ஆலோசனை**",
            "te": "✨ **తుది ఇతిహాస సలహా**",
            "bn": "✨ **চূড়ান্ত মহাকাব্যিক পরামর্শ**",
            "mr": "✨ **अंतिम महाकाव्य मार्गदर्शन**",
            "gu": "✨ **અંતિમ મહાકાવ્ય પરામર્શ**",
            "kn": "✨ **ಅಂತಿಮ ಮಹಾಕಾವ್ಯ ಸಲಹೆ**",
            "ml": "✨ **അന്തിമ ഇതിഹാസ ഉപദേശം**",
            "pa": "✨ **ਅੰਤਿਮ ਮਹਾਂਕਾਵਿ ਸਲਾਹ**",
            "or": "✨ **ଚୂଡ଼ାନ୍ତ ମହାକାବ୍ୟ ପରାମର୍ଶ**",
            "as": "✨ **চূড়ান্ত মহাকাব্যিক পৰামৰ্শ**",
            "ur": "✨ **حتمی داستانی رہنمائی**",
            "mai": "✨ **अंतिम महाकाव्य परामर्श**",
            "ne": "✨ **अन्तिम महाकाव्य परामर्श**",
            "kok": "✨ **निमाणो महाकाव्य सल्लो**",
            "doi": "✨ **अंतिम महाकाव्य सलाह**",
            "ks": "✨ **حتمی مہاکاوی مشورہ**",
            "sd": "✨ **حتمي مهاڪاوين جي صلاح**",
            "mni": "✨ **মহাকাব্যগী অরোইবা পাউতাক**",
            "brx": "✨ **जोबथा महाकाव्य सुबुंथि**",
            "sat": "✨ **ᱢᱩᱪᱟᱹᱫ ᱢᱟᱦᱟᱠᱟᱵᱽᱭᱚ ᱫᱤᱥᱟᱹ**",
        }
        return headers.get(lang, "✨ **Final Epic Counsel**")

class StrategyService:
    def __init__(self):
        self.rag_service = RAGService()


    # -------------------------------------------------------------
    # STRATEGY 5: Full Chat (Continuous Memory + Socratic + Follow-up RAG)
    # -------------------------------------------------------------
    def process_full_chat(
        self,
        message: str,
        chat_history: List[Dict[str, Any]],
        force_resolve: bool = False,
        session_id: str = None,
        provider: str = None,
        language: str = "en"
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
            t.get("stage") == "resolved" or "✨" in t.get("content", "") or "Final Epic Counsel" in t.get("content", "") or "अंतिम" in t.get("content", "")
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
                rag_res = self.rag_service.query(message=search_query, provider=provider, language=language)
                sources = rag_res.get("sources", [])
                context_str = "\n".join([f"Scenario: {s.scenario_title} ({s.epic}) - {s.summary_snippet}" for s in sources])
            else:
                print(f"   ⚡ [Full Chat Direct Answer] Answering directly from conversation memory (No vector search needed)")

            lang_directive = get_language_directive(language)
            followup_system_prompt = f"""
You are a Wise Epic Mentor continuing a deep conversation with a user who has already received your Final Epic Counsel.
Your task is to answer their follow-up questions with warmth, wisdom, and complete conversational continuity.

RULES:
1. LANGUAGE: Keep sentences clear, short, empathetic, and warm.
2. CONTINUITY: Maintain full awareness of the conversation history and your previous advice.
3. REASONING: If the user asks why you made a judgment or compared them to a character, explain your reasoning simply.
4. EXPLAINING EPICS: If new scripture context is provided, weave the story lessons naturally into your answer.
5. SANSKRIT TERMS: If you mention words like 'Dharma' or 'Karma', explain them in 2-3 simple words.
6. MEDICAL & HEALTH SAFETY (CRITICAL & MANDATORY):
   - You are a spiritual, philosophical, and epic mentor. You are NOT a medical doctor or healthcare professional.
   - If the user mentions any medical condition, physical/mental health symptoms, illness, doctors' prescriptions, medicines, dosages, or health routines:
     a) NEVER prescribe medicines, diagnose health conditions, or suggest changing/stopping any doctor-prescribed treatment, medicine, or routine.
     b) ALWAYS explicitly advise the user to consult a qualified medical doctor or healthcare professional for all medical and prescription decisions.
     c) You may ONLY offer emotional resilience, peace of mind, patience, and courage from the epics to support their well-being alongside professional care.
{lang_directive}
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
                "character": "Universal Epic Scholar",
                "sources": sources,
                "searched_vector_db": needs_search,
                "provider_used": llm_res["provider_used"],
                "prompt_tokens": llm_res.get("prompt_tokens", 0),
                "completion_tokens": llm_res.get("completion_tokens", 0)
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
            lang_directive = get_language_directive(language)
            interview_system_prompt = f"""
You are a wise, empathetic Master Counselor inspired by the Indian Epics (Ramayana & Mahabharata).
Your task is to understand the user's dilemma deeply before giving any final advice.

RULES:
1. Do NOT give final advice or scripture citations yet.
2. Empathetically acknowledge their situation in 1 simple sentence.
3. Ask 1 deep, targeted Socratic question to uncover the root cause or personal stakes.
4. Keep your question warm, clear, and under 50 words.
{lang_directive}
"""
            interview_prompt = f"{combined_text}\n\nAsk 1 deep, simple Socratic question to understand their dilemma better:"
            llm_res = LLMFactory.generate_response(interview_prompt, interview_system_prompt, provider)

            return {
                "stage": "interviewing",
                "reply": llm_res["reply"],
                "character": "Universal Epic Scholar",
                "sources": [],
                "searched_vector_db": False,
                "provider_used": llm_res["provider_used"],
                "prompt_tokens": llm_res.get("prompt_tokens", 0),
                "completion_tokens": llm_res.get("completion_tokens", 0)
            }
        else:
            # Generate Final Epic Counsel with ChromaDB RAG
            rag_res = self.rag_service.query(message=combined_text, provider=provider, language=language)
            counsel_title = get_counsel_heading(language)
            return {
                "stage": "resolved",
                "reply": f"{counsel_title}\n\n{rag_res['reply']}",
                "character": "Universal Epic Scholar",
                "sources": rag_res.get("sources", []),
                "searched_vector_db": True,
                "provider_used": rag_res["provider_used"],
                "prompt_tokens": rag_res.get("prompt_tokens", 0),
                "completion_tokens": rag_res.get("completion_tokens", 0)
            }


    def _evaluate_context_sufficiency(self, user_text: str, turn_number: int, provider: str = None) -> bool:
        """
        Evaluates whether the user has provided enough context about their dilemma
        (who is involved, what choice they face, stakes/emotions) to deliver final grounded counsel.
        - Turn 1: Returns False to ensure at least 1 deep Socratic question is asked, unless text is exceptionally comprehensive (>80 words).
        - Turn 2: Evaluates with LLM or word length/detail.
        - Turn 3+: Handled by safety brake (True).
        """
        words = user_text.strip().split()
        if len(words) < 20:
            return False

        if turn_number <= 1 and len(words) < 80:
            # Turn 1: Always ask a probing Socratic question to build personal context
            return False

        eval_system_prompt = "You are an evaluator in an expert Vedic counseling system. Output ONLY valid JSON."
        eval_prompt = f"""
Analyze the seeker's shared situation below:
\"\"\"{user_text}\"\"\"

Turn count: {turn_number}

Task:
Determine if the seeker has provided sufficient context regarding:
1. Their core dilemma or specific question.
2. The key stakeholders, choices, or emotional tension involved.

If YES (the situation is clear enough to deliver final definitive counsel and story parallels):
{{"is_sufficient": true, "reason": "Sufficient details provided"}}

If NO (too brief, vague, or missing emotional stakes/context):
{{"is_sufficient": false, "reason": "Needs targeted clarification"}}

Output JSON ONLY:
"""
        try:
            res = LLMFactory.generate_response(eval_prompt, eval_system_prompt, provider)
            clean_reply = res["reply"].strip()
            if clean_reply.startswith("```"):
                clean_reply = clean_reply.split("```")[1].replace("json", "").strip()
            import json
            data = json.loads(clean_reply)
            return bool(data.get("is_sufficient", False))
        except Exception as e:
            print(f"Context Sufficiency Evaluator Warning: {e}")
            return turn_number >= 2 and len(words) >= 40

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
        provider: str = None,
        language: str = "en"
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
            t.get("stage") == "resolved" or "✨" in t.get("content", "") or "Final Counsel from" in t.get("content", "") or "अंतिम" in t.get("content", "")
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

            lang_directive = get_language_directive(language)
            followup_system_prompt = f"""
You are {active_char} from the Indian Epics. You are in deep, 1st-person conversation with a seeker who has already received your primary counsel.
Answer their follow-up thoughts, questions, or doubts with authentic 1st-person wisdom drawn from your own life and principles.

RULES:
1. Speak exclusively in 1st person as {active_char}.
2. Maintain full awareness of what the seeker has shared across all prior turns.
3. Keep your response clear, warm, and under 150 words.
{lang_directive}
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
                "provider_used": llm_res["provider_used"],
                "prompt_tokens": llm_res.get("prompt_tokens", 0),
                "completion_tokens": llm_res.get("completion_tokens", 0)
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
            lang_directive = get_language_directive(language)
            interview_system_prompt = f"""
You are {active_char}. A seeker has approached you for guidance with a personal dilemma.
Before revealing your definitive judgment and the lessons from your own life, you must understand their circumstance more deeply.

RULES:
1. Speak strictly in the 1st-person voice and authentic persona of {active_char}.
2. In 1 warm sentence, acknowledge their struggle.
3. Ask 1 deep, targeted Socratic question in your voice to uncover the root cause, hidden motivations, or emotional stakes (e.g. duty vs attachment, fear vs truth).
4. Do NOT deliver your final advice or scripture citations yet.
5. Keep your response under 55 words.
6. MEDICAL & HEALTH SAFETY (CRITICAL & MANDATORY): If the seeker mentions health, prescriptions, or medicines, NEVER prescribe or change medical routines. Advise consulting a doctor, offering only emotional support.
{lang_directive}
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
                "provider_used": llm_res["provider_used"],
                "prompt_tokens": llm_res.get("prompt_tokens", 0),
                "completion_tokens": llm_res.get("completion_tokens", 0)
            }
        else:
            # Generate Final 1st-Person Epic Counsel using ChromaDB with strict character filter
            rag_res = self.rag_service.query_by_character(
                message=combined_text,
                character=active_char,
                provider=provider,
                chat_history=chat_history,
                language=language
            )
            counsel_title = get_counsel_heading(language, active_char)
            return {
                "stage": "resolved",
                "mode": "guidance",
                "reply": f"{counsel_title}\n\n{rag_res['reply']}",
                "character": active_char,
                "sources": rag_res.get("sources", []),
                "searched_vector_db": True,
                "provider_used": rag_res["provider_used"],
                "prompt_tokens": rag_res.get("prompt_tokens", 0),
                "completion_tokens": rag_res.get("completion_tokens", 0)
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
        provider: str = None,
        language: str = "en"
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
        lang_directive = get_language_directive(language)

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
1. LANGUAGE & TONE: Keep your tone warm, empathetic, and approachable in clear sentences.
2. 1ST PERSON PERSPECTIVE: Speak in 1st person as {lead_speaker}.
3. 1 CONCISE QUESTION: Ask ONLY 1 concise probing question (under 45 words).
4. NO FINAL COUNSEL: Do not quote scripture or give final resolutions yet.
5. MEDICAL & HEALTH SAFETY (CRITICAL & MANDATORY): If the seeker mentions health, prescriptions, or medicines, NEVER prescribe or change medical routines. Advise consulting a doctor, offering only emotional support.
{lang_directive}
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

            total_prompt_tokens = llm_res.get("prompt_tokens", 0)
            total_completion_tokens = llm_res.get("completion_tokens", 0)

            return {
                "replies": replies,
                "active_council": active_council,
                "muted_council": muted,
                "stage": "interviewing",
                "provider_used": llm_res["provider_used"],
                "prompt_tokens": total_prompt_tokens,
                "completion_tokens": total_completion_tokens
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
        total_prompt_tokens = 0
        total_completion_tokens = 0

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
                    chat_history=history,
                    language=language
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
1. LANGUAGE & TONE: Keep your tone warm, empathetic, and approachable in clear sentences.
2. 1ST PERSON PERSPECTIVE: Speak strictly in 1st person as {speaker} ("I", "my life", "my duty", "in my struggle").
3. SANSKRIT TERMS: If you use terms like 'Dharma' or 'Karma', explain them in 2-3 simple words.
4. DRAW FROM EPICS: Draw directly from your personal epic memories, decisions, and lived philosophy.
5. MUTUAL AWARENESS: If fellow legends have already spoken earlier or in this turn, you may warmly acknowledge, build upon, or respectfully contrast their viewpoint.
6. CRISP & IMPACTFUL: Offer practical wisdom for the seeker's situation in short, clear sentences under 110 words.
7. MEDICAL & HEALTH SAFETY (CRITICAL & MANDATORY):
   - You are a spiritual, philosophical, and epic mentor. You are NOT a medical doctor or healthcare professional.
   - If the user mentions any medical condition, physical/mental health symptoms, illness, doctors' prescriptions, medicines, dosages, or health routines:
     a) NEVER prescribe medicines, diagnose health conditions, or suggest changing/stopping any doctor-prescribed treatment, medicine, or routine.
     b) ALWAYS explicitly advise the user to consult a qualified medical doctor or healthcare professional for all medical and prescription decisions.
     c) You may ONLY offer emotional resilience, peace of mind, patience, and courage from the epics to support their well-being alongside professional care.
{lang_directive}
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
            total_prompt_tokens += llm_res.get("prompt_tokens", 0)
            total_completion_tokens += llm_res.get("completion_tokens", 0)

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
            "provider_used": last_provider,
            "prompt_tokens": total_prompt_tokens,
            "completion_tokens": total_completion_tokens
        }

