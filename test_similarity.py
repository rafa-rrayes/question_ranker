from openai import OpenAI
from numpy import dot
from numpy.linalg import norm
from dotenv import load_dotenv
import json

load_dotenv()

client = OpenAI()

def cosine_similarity(a, b):
    return dot(a, b) / (norm(a) * norm(b))

def load_questions_with_embeddings():
    try:
        with open('questions_embeddings.json', 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print("Error: questions_embeddings.json not found.")
        print("Please run 'python calculate_embeddings.py' first.")
        return None

def find_similar_questions(query, top_n=10):
    # Load questions
    questions = load_questions_with_embeddings()
    if not questions:
        return

    # Calculate embedding for the query
    print(f"\nCalculating embedding for: '{query}'")
    response = client.embeddings.create(
        input=query,
        model="text-embedding-3-small"
    )
    query_embedding = response.data[0].embedding

    # Calculate similarity for each question
    questions_with_similarity = []
    for q in questions:
        similarity = cosine_similarity(query_embedding, q['embedding'])
        questions_with_similarity.append({
            'question': q['question'],
            'answer': q['answer'],
            'similarity': similarity
        })

    # Sort by similarity (highest first)
    questions_with_similarity.sort(key=lambda x: x['similarity'], reverse=True)

    # Print top N results
    print(f"\nTop {top_n} most similar questions:\n")
    print("-" * 80)
    for i, q in enumerate(questions_with_similarity[:top_n], 1):
        print(f"{i}. [{q['similarity']:.4f}] {q['question']}")
        print(f"   Answer: {q['answer']}")
        print()

if __name__ == '__main__':
    print("Question Similarity Tester")
    print("=" * 80)

    while True:
        query = input("\nEnter your query (or 'quit' to exit): ").strip()

        if query.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break

        if not query:
            print("Please enter a valid query.")
            continue

        find_similar_questions(query)
