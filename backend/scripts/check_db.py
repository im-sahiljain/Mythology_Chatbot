import chromadb

# Connect to your local ChromaDB
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_collection(name="epic_scenario_cards")

import json

# Get all data (including embeddings, which are large mathematical vectors)
all_data = collection.get(include=['documents', 'metadatas', 'embeddings'])

# Convert embeddings to standard lists if they are numpy arrays (just to be safe for JSON serialization)
if all_data.get('embeddings') is not None:
    all_data['embeddings'] = [list(emb) for emb in all_data['embeddings']]

# Save to a readable JSON file
output_file = "chromadb_dump.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(all_data, f, indent=4, ensure_ascii=False)

print(f"Successfully saved {len(all_data['ids'])} records to {output_file}")
print(f"Total documents in DB: {collection.count()}")
