import json
import os
import pickle
import sys

def main():
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("Please install sentence-transformers: pip install sentence-transformers")
        sys.exit(1)

    input_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/synthetic_tickets.json'))
    output_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/synthetic_tickets_embedded.pkl'))

    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found. Run generate_synthetic_dataset.py first.")
        sys.exit(1)

    print("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    print(f"Reading dataset from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        dataset = json.load(f)

    print(f"Generating embeddings for {len(dataset)} tickets...")
    
    # Combine title and description for embedding
    texts = [f"{ticket['title']}. {ticket['description']}" for ticket in dataset]
    
    embeddings = model.encode(texts, show_progress_bar=True)
    
    # Store embedding back into the dataset objects
    for i, ticket in enumerate(dataset):
        ticket['embedding'] = embeddings[i]

    print(f"Saving embedded dataset to {output_file}...")
    with open(output_file, 'wb') as f:
        pickle.dump(dataset, f)
        
    print("Done!")

if __name__ == '__main__':
    main()
