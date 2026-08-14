from typing import List
from app.config import settings

class EmbeddingFactory:
    """Multi-Provider Embedding Factory for ChromaDB Ingestion and Vector Search."""

    @staticmethod
    def get_embedding(text: str, provider: str = None) -> List[float]:
        selected_provider = (provider or settings.DEFAULT_LLM_PROVIDER).lower()

        if selected_provider == "ollama":
            return EmbeddingFactory._get_ollama_embedding(text)
        elif selected_provider == "openai":
            return EmbeddingFactory._get_openai_embedding(text)
        elif selected_provider == "gemini":
            return EmbeddingFactory._get_gemini_embedding(text)
        else:
            return EmbeddingFactory._get_ollama_embedding(text)

    @staticmethod
    def _get_ollama_embedding(text: str) -> List[float]:
        try:
            import ollama
            client = ollama.Client(host=settings.OLLAMA_BASE_URL)
            response = client.embeddings(
                model=settings.OLLAMA_EMBED_MODEL,
                prompt=text
            )
            return response["embedding"]
        except Exception as e:
            print(f"Ollama Embedding Error: {e}")
            return []

    @staticmethod
    def _get_openai_embedding(text: str) -> List[float]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"OpenAI Embedding Error: {e}")
            return []

    @staticmethod
    def _get_gemini_embedding(text: str) -> List[float]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"Gemini Embedding Error: {e}")
            return []
