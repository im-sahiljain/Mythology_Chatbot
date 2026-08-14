import os
from typing import Dict, Any, List
from app.config import settings

class LLMFactory:
    """Multi-LLM Provider Factory supporting Ollama, OpenAI, and Google Gemini."""

    @staticmethod
    def generate_response(
        prompt: str,
        system_prompt: str,
        provider: str = None
    ) -> Dict[str, str]:
        selected_provider = (provider or settings.DEFAULT_LLM_PROVIDER).lower()
        print(f"\n🤖 [LLM Factory] Generating response using Provider: '{selected_provider.upper()}'")

        if selected_provider == "ollama":
            return LLMFactory._call_ollama(prompt, system_prompt)
        elif selected_provider == "openai":
            return LLMFactory._call_openai(prompt, system_prompt)
        elif selected_provider == "gemini":
            return LLMFactory._call_gemini(prompt, system_prompt)
        else:
            # Default to Ollama fallback
            return LLMFactory._call_ollama(prompt, system_prompt)

    @staticmethod
    def _call_ollama(prompt: str, system_prompt: str) -> Dict[str, str]:
        try:
            import ollama
            print(f"🦙 [Ollama Local] Model: '{settings.OLLAMA_MODEL}' | Host: '{settings.OLLAMA_BASE_URL}'")
            client = ollama.Client(host=settings.OLLAMA_BASE_URL)
            response = client.chat(
                model=settings.OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            return {
                "reply": response['message']['content'],
                "provider_used": f"ollama/{settings.OLLAMA_MODEL}"
            }
        except Exception as e:
            return {
                "reply": f"Ollama local service error: {str(e)}",
                "provider_used": "ollama/error"
            }

    @staticmethod
    def _call_openai(prompt: str, system_prompt: str) -> Dict[str, str]:
        try:
            from openai import OpenAI
            print(f"🧠 [OpenAI API] Model: '{settings.OPENAI_MODEL}'")
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            return {
                "reply": response.choices[0].message.content,
                "provider_used": f"openai/{settings.OPENAI_MODEL}"
            }
        except Exception as e:
            return {
                "reply": f"OpenAI API error: {str(e)}",
                "provider_used": "openai/error"
            }

    @staticmethod
    def _call_gemini(prompt: str, system_prompt: str) -> Dict[str, str]:
        try:
            import google.generativeai as genai
            print(f"✨ [Google Gemini] Model: '{settings.GEMINI_MODEL}'")
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=system_prompt
            )
            response = model.generate_content(prompt)
            return {
                "reply": response.text,
                "provider_used": f"gemini/{settings.GEMINI_MODEL}"
            }
        except Exception as e:
            return {
                "reply": f"Gemini API error: {str(e)}",
                "provider_used": "gemini/error"
            }
