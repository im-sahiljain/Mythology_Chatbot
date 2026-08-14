import os
import sys
import json
import time
import warnings
from pathlib import Path

# Suppress deprecation warnings for cleaner terminal output
warnings.filterwarnings("ignore")

# Add backend parent directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.config import settings

def parse_verses_into_batches(nalanda_dir: Path, verses_per_batch: int = 100):
    """Parses raw text parts from nalanda_library into batch chunks of verses."""
    all_verses = []
    
    files = sorted(list(nalanda_dir.glob("nalanda_corpus_part_*.txt")))
    if not files:
        files = sorted(list(nalanda_dir.glob("*.txt")))

    print(f"Found {len(files)} scripture corpus text files.")
    
    current_verse = {}
    for file_path in files:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("Source:"):
                    if current_verse.get("sanskrit") or current_verse.get("english"):
                        all_verses.append(current_verse)
                    current_verse = {"source": line.split(":", 1)[1].strip()}
                elif line.startswith("Category:"):
                    current_verse["category"] = line.split(":", 1)[1].strip()
                elif line.startswith("Title:"):
                    current_verse["title"] = line.split(":", 1)[1].strip()
                elif line.startswith("Verse:"):
                    current_verse["verse"] = line.split(":", 1)[1].strip()
                elif line.startswith("Sanskrit:"):
                    current_verse["sanskrit"] = line.split(":", 1)[1].strip()
                elif line.startswith("English:"):
                    current_verse["english"] = line.split(":", 1)[1].strip()

    if current_verse.get("sanskrit") or current_verse.get("english"):
        all_verses.append(current_verse)

    print(f"Total parsed raw verses: {len(all_verses)}")

    batches = []
    for i in range(0, len(all_verses), verses_per_batch):
        chunk = all_verses[i:i + verses_per_batch]
        category = chunk[0].get("category", "Epic")
        combined_text = f"Epic Category: {category}\nVerse Range: {chunk[0].get('title', '')} to {chunk[-1].get('title', '')}\n\n"
        for v in chunk:
            s = v.get('sanskrit', '')
            e = v.get('english', '')
            combined_text += f"[{v.get('title', '')}] {s}\nEnglish: {e}\n\n"
        
        batches.append({
            "category": category,
            "verse_range": f"{chunk[0].get('title', '')}-{chunk[-1].get('title', '')}",
            "text": combined_text
        })
        
    print(f"Created {len(batches)} batch chunks ({verses_per_batch} verses per batch).")
    return batches

def extract_scenario_gemini(batch_data: dict, model_name: str = "gemini-3.1-flash-lite"):
    """Calls Gemini API with rate-limit pacing to extract structured Scenario Cards."""
    try:
        import google.generativeai as genai
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is missing in environment or .env file.")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={"response_mime_type": "application/json"}
        )

        schema_text = """
{
  "scenario_id": "EPIC_CHAPTER_001",
  "epic": "Ramayana or Mahabharata",
  "parva_kanda": "Section/Kanda name",
  "chapter_sarga": "Chapter name/number",
  "title": "Title of the episode/event",
  "entities": {
    "protagonist": {"canonical_name": "Name", "role": "Role"},
    "mentor_advisor": {"canonical_name": "Name", "role": "Role"},
    "opponents_relatives": [{"canonical_name": "Name", "relationship": "Relation"}]
  },
  "dilemma_profile": {
    "primary_category": "Duty_vs_Kinship or Leadership or Ethics",
    "abstract_search_tags": ["conflict of interest", "modern tag 2", "modern tag 3"]
  },
  "narrative_context": {
    "narrative_summary": "Concise summary of the story and conflict"
  },
  "resolution_and_advice": {
    "decision_made": "Choice made by character",
    "primary_philosophical_principle": {
      "sanskrit_term": "Dharma / Nishkama Karma",
      "core_teaching": "Core ethical takeaway"
    }
  },
  "scripture_citations": {
    "primary_verses": [{"verse_id": "Verse ID", "english": "Key verse excerpt"}]
  }
}
"""

        prompt = "You are an expert scholar of Ramayana and Mahabharata.\n" \
                 "Read the following verse scene batch and extract 1 structured Scenario Card JSON object following this exact schema:\n\n" \
                 + schema_text + "\n\nVerse Text Batch:\n" + batch_data['text']

        response = model.generate_content(prompt)
        res_json = json.loads(response.text)
        return res_json
    except Exception as e:
        print(f"Extraction Error for batch {batch_data['verse_range']}: {e}")
        return None

def main():
    print("=" * 70)
    print("Vedic RAG - Automated Gemini 3.1 Flash Lite Extraction Pipeline")
    print("=" * 70)

    RPM_LIMIT = 14            # Max 15 Requests Per Minute -> Delay 4.28s
    SLEEP_DELAY = 60.0 / RPM_LIMIT  # ~4.28 seconds per request
    MAX_RPD = 450             # Respect 500 Requests Per Day limit

    nalanda_dir = settings.NALANDA_LIBRARY_DIR
    output_file = settings.EPIC_SCENARIOS_FILE

    if not nalanda_dir.exists():
        print(f"ERROR: {nalanda_dir} not found. Please symlink nalanda_library.")
        sys.exit(1)

    batches = parse_verses_into_batches(nalanda_dir, verses_per_batch=100)
    
    existing_scenarios = []
    if output_file.exists():
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                existing_scenarios = json.load(f)
            print(f"Loaded {len(existing_scenarios)} existing scenarios from {output_file}")
        except Exception:
            existing_scenarios = []

    model_name = settings.GEMINI_MODEL or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    print(f"Using Model: {model_name}")
    print(f"Pacing Requests: {SLEEP_DELAY:.2f}s delay per request (Strict 14 RPM compliance)")
    print(f"Processing up to {min(len(batches), MAX_RPD)} batches...")

    count = len(existing_scenarios)
    for idx, batch in enumerate(batches[:MAX_RPD]):
        print(f"[{idx+1}/{min(len(batches), MAX_RPD)}] Extracting scenario for {batch['verse_range']}...")
        card = extract_scenario_gemini(batch, model_name=model_name)
        if card:
            existing_scenarios.append(card)
            count += 1
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(existing_scenarios, f, indent=2, ensure_ascii=False)
        
        # Pacing sleep for rate limits
        time.sleep(SLEEP_DELAY)

    print("=" * 70)
    print(f"✅ Extraction completed! Saved {count} scenario cards to {output_file}")
    print("=" * 70)

if __name__ == "__main__":
    main()
