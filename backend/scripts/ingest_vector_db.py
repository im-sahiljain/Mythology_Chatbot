import os
import sys
import json
from pathlib import Path
import chromadb

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.config import settings

def flatten_scenarios(raw_scenarios):
    """Flattens raw JSON objects regardless of whether items are dicts, lists, or wrapped."""
    flat_list = []
    
    def process_item(element, idx):
        if isinstance(element, list):
            for sub_idx, sub_element in enumerate(element):
                process_item(sub_element, f"{idx}_{sub_idx}")
        elif isinstance(element, dict):
            # If element has a nested 'scenario' or 'data' key containing a dict
            if "scenario" in element and isinstance(element["scenario"], dict):
                element = element["scenario"]
            
            # Ensure scenario_id exists
            sid = element.get("scenario_id") or element.get("id") or f"SCENARIO_{idx}"
            if not isinstance(sid, str):
                sid = str(sid)
                
            element["scenario_id"] = sid
            flat_list.append(element)

    if isinstance(raw_scenarios, list):
        for idx, item in enumerate(raw_scenarios):
            process_item(item, idx)
    elif isinstance(raw_scenarios, dict):
        process_item(raw_scenarios, 0)
        
    return flat_list

def main():
    print("=" * 70)
    print("Vedic RAG - Resilient ChromaDB Vector Index Ingestion Script")
    print("=" * 70)

    scenarios_file = settings.EPIC_SCENARIOS_FILE
    if not scenarios_file.exists():
        print(f"ERROR: {scenarios_file} does not exist.")
        print("Please run extract_scenarios.py first to generate epic_scenarios.json")
        sys.exit(1)

    print(f"Loading scenario cards from: {scenarios_file}")
    with open(scenarios_file, "r", encoding="utf-8") as f:
        raw_scenarios = json.load(f)

    scenarios = flatten_scenarios(raw_scenarios)
    print(f"Loaded and flattened {len(scenarios)} valid scenario cards.")

    # Initialize ChromaDB Local Embedded Client
    settings.CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=str(settings.CHROMA_DB_DIR))
    collection = chroma_client.get_or_create_collection(name="epic_scenario_cards")

    documents = []
    metadatas = []
    ids = []

    for idx, item in enumerate(scenarios):
        sid = item.get("scenario_id", f"SCENARIO_{idx}")
        title = item.get("title") or item.get("scenario_title") or "Epic Scenario"
        epic = item.get("epic") or "Ramayana/Mahabharata"
        
        dilemma = item.get("dilemma_profile") if isinstance(item.get("dilemma_profile"), dict) else {}
        category = dilemma.get("primary_category") or item.get("category") or "Ethics"
        
        tags = dilemma.get("abstract_search_tags", [])
        if isinstance(tags, list):
            tags_str = " ".join([str(t) for t in tags])
        else:
            tags_str = str(tags)
            
        narrative = item.get("narrative_context") if isinstance(item.get("narrative_context"), dict) else {}
        summary = narrative.get("narrative_summary") or item.get("summary") or ""
        
        resolution = item.get("resolution_and_advice") if isinstance(item.get("resolution_and_advice"), dict) else {}
        principle_obj = resolution.get("primary_philosophical_principle") if isinstance(resolution.get("primary_philosophical_principle"), dict) else {}
        principle = principle_obj.get("core_teaching") or resolution.get("decision_made") or ""

        # Create combined search text string
        search_text = f"Title: {title}. Epic: {epic}. Category: {category}. Tags: {tags_str}. Summary: {summary}. Principle: {principle}"

        protagonist = ""
        entities = item.get("entities")
        if isinstance(entities, dict):
            protag_obj = entities.get("protagonist")
            if isinstance(protag_obj, dict):
                protagonist = protag_obj.get("canonical_name", "")
            elif isinstance(protag_obj, str):
                protagonist = protag_obj

        documents.append(search_text)
        ids.append(f"{sid}_{idx}")  # Ensure unique ID
        metadatas.append({
            "scenario_id": str(sid),
            "title": str(title),
            "epic": str(epic),
            "primary_category": str(category),
            "protagonist": str(protagonist)
        })

    print(f"Indexing {len(documents)} scenario cards into ChromaDB collection 'epic_scenario_cards'...")
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    print("=" * 70)
    print("✅ Ingestion successfully completed!")
    print(f"Total Vector Embeddings in ChromaDB: {collection.count()}")
    print(f"ChromaDB local folder: {settings.CHROMA_DB_DIR.absolute()}")
    print("=" * 70)

if __name__ == "__main__":
    main()
