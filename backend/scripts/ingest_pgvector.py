import os
import sys
import json
import time
from pathlib import Path
from sqlalchemy import text

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.config import settings
from app.db.session import engine
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

def flatten_scenarios(raw_scenarios):
    """Flattens raw JSON objects regardless of whether items are dicts, lists, or wrapped."""
    flat_list = []
    
    def process_item(element, idx):
        if isinstance(element, list):
            for sub_idx, sub_element in enumerate(element):
                process_item(sub_element, f"{idx}_{sub_idx}")
        elif isinstance(element, dict):
            if "scenario" in element and isinstance(element["scenario"], dict):
                element = element["scenario"]
            sid = element.get("scenario_id") or element.get("id") or f"SCENARIO_{idx}"
            element["scenario_id"] = str(sid)
            flat_list.append(element)

    if isinstance(raw_scenarios, list):
        for idx, item in enumerate(raw_scenarios):
            process_item(item, idx)
    elif isinstance(raw_scenarios, dict):
        process_item(raw_scenarios, 0)
        
    return flat_list

def create_table_if_not_exists():
    print("🔧 Ensuring pgvector extension & table exist in Supabase...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS epic_scenario_embeddings (
                id TEXT PRIMARY KEY,
                scenario_title TEXT NOT NULL,
                epic TEXT NOT NULL,
                protagonist TEXT,
                primary_category TEXT,
                summary_snippet TEXT,
                verse_refs JSONB,
                search_text TEXT,
                embedding vector(768),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS epic_scenarios_vector_hnsw_idx 
            ON epic_scenario_embeddings 
            USING hnsw (embedding vector_cosine_ops);
        """))
        conn.commit()
    print("✅ Table 'epic_scenario_embeddings' ready with HNSW vector index.")

def get_embedding(text_content: str) -> list:
    """Generates 768-dim normalized embedding using Gemini API with retry."""
    for attempt in range(4):
        try:
            res = genai.embed_content(
                model="models/gemini-embedding-001",
                content=text_content,
                task_type="retrieval_document",
                output_dimensionality=768
            )
            return res["embedding"]
        except Exception as e:
            if attempt == 3:
                raise e
            time.sleep(1 + attempt * 2)

def main():
    print("=" * 70)
    print("🚀 Supabase pgvector Ingestion - 475+ Epic Scenario Cards")
    print("=" * 70)

    create_table_if_not_exists()

    scenarios_file = settings.EPIC_SCENARIOS_FILE
    if not scenarios_file.exists():
        print(f"❌ Error: {scenarios_file} not found.")
        sys.exit(1)

    with open(scenarios_file, "r", encoding="utf-8") as f:
        raw = json.load(f)

    scenarios = flatten_scenarios(raw)
    print(f"📦 Loaded {len(scenarios)} scenario cards to embed.\n")

    # Check how many already exist in database
    with engine.connect() as conn:
        existing_count = conn.execute(text("SELECT count(*) FROM epic_scenario_embeddings;")).scalar()
    print(f"📊 Current records in Supabase: {existing_count}")

    if existing_count >= len(scenarios):
        print("✅ Database already contains all scenario cards! Re-indexing skipped.")
        return

    print("Embedding scenario cards with Gemini (models/gemini-embedding-001, 768-dim)...")
    
    batch_size = 20
    inserted = 0

    for i in range(0, len(scenarios), batch_size):
        batch = scenarios[i:i + batch_size]
        rows_to_insert = []

        for idx_offset, item in enumerate(batch):
            global_idx = i + idx_offset
            sid = item.get("scenario_id", f"SCENARIO_{global_idx}")
            title = item.get("title") or item.get("scenario_title") or "Epic Scenario"
            epic = item.get("epic") or "Ramayana/Mahabharata"

            dilemma = item.get("dilemma_profile") if isinstance(item.get("dilemma_profile"), dict) else {}
            category = dilemma.get("primary_category") or item.get("category") or "Ethics"
            tags = dilemma.get("abstract_search_tags", [])
            tags_str = " ".join([str(t) for t in tags]) if isinstance(tags, list) else str(tags)

            narrative = item.get("narrative_context") if isinstance(item.get("narrative_context"), dict) else {}
            summary = narrative.get("narrative_summary") or item.get("summary") or ""

            resolution = item.get("resolution_and_advice") if isinstance(item.get("resolution_and_advice"), dict) else {}
            principle_obj = resolution.get("primary_philosophical_principle") if isinstance(resolution.get("primary_philosophical_principle"), dict) else {}
            principle = principle_obj.get("core_teaching") or resolution.get("decision_made") or ""

            protagonist = ""
            entities = item.get("entities")
            if isinstance(entities, dict):
                protag_obj = entities.get("protagonist")
                if isinstance(protag_obj, dict):
                    protagonist = protag_obj.get("canonical_name", "")
                elif isinstance(protag_obj, str):
                    protagonist = protag_obj

            verse_refs = item.get("scriptural_anchors") or item.get("verse_citations") or item.get("verses") or []

            search_text = f"Title: {title}. Epic: {epic}. Category: {category}. Tags: {tags_str}. Summary: {summary}. Principle: {principle}"
            
            clean_story = summary
            if principle:
                clean_story = f"{summary.strip().rstrip('.')}.\n\n✨ Core Teaching: {principle.strip()}"

            # Generate embedding
            emb = get_embedding(search_text)

            rows_to_insert.append({
                "id": f"{sid}_{global_idx}",
                "scenario_title": title,
                "epic": epic,
                "protagonist": protagonist or "General",
                "primary_category": category,
                "summary_snippet": clean_story,
                "verse_refs": json.dumps(verse_refs) if isinstance(verse_refs, (list, dict)) else "[]",
                "search_text": search_text,
                "embedding": str(emb)
            })

        # Insert batch into PostgreSQL
        with engine.connect() as conn:
            for r in rows_to_insert:
                conn.execute(text("""
                    INSERT INTO epic_scenario_embeddings 
                        (id, scenario_title, epic, protagonist, primary_category, summary_snippet, verse_refs, search_text, embedding)
                    VALUES 
                        (:id, :scenario_title, :epic, :protagonist, :primary_category, :summary_snippet, CAST(:verse_refs AS jsonb), :search_text, CAST(:embedding AS vector))
                    ON CONFLICT (id) DO UPDATE SET
                        scenario_title = EXCLUDED.scenario_title,
                        epic = EXCLUDED.epic,
                        protagonist = EXCLUDED.protagonist,
                        primary_category = EXCLUDED.primary_category,
                        summary_snippet = EXCLUDED.summary_snippet,
                        verse_refs = EXCLUDED.verse_refs,
                        search_text = EXCLUDED.search_text,
                        embedding = EXCLUDED.embedding;
                """), r)
            conn.commit()

        inserted += len(rows_to_insert)
        print(f"  ⚡ Processed & Uploaded {inserted}/{len(scenarios)} cards...")
        time.sleep(0.5)

    print("\n" + "=" * 70)
    print(f"🎉 Ingestion complete! Total {inserted} scenario cards active in Supabase pgvector.")
    print("=" * 70)

if __name__ == "__main__":
    main()
