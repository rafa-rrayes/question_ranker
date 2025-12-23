from openai import OpenAI
from dotenv import load_dotenv
import csv
import json

load_dotenv()

client = OpenAI()

def calculate_embeddings():
    questions = []

    # Load questions from CSV
    with open('questions.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file, delimiter=';')
        for row in reader:
            questions.append({
                'question': row['questions'],
                'answer': row['answer']
            })

    print(f"Calculating embeddings for {len(questions)} questions...")

    # Calculate embeddings for all questions
    questions_with_embeddings = []
    for i, q in enumerate(questions):
        print(f"Processing {i+1}/{len(questions)}: {q['question'][:50]}...")

        response = client.embeddings.create(
            input=q['question'],
            model="text-embedding-3-small"
        )

        questions_with_embeddings.append({
            'question': q['question'],
            'answer': q['answer'],
            'embedding': response.data[0].embedding
        })

    # Save to JSON file
    with open('questions_embeddings.json', 'w', encoding='utf-8') as f:
        json.dump(questions_with_embeddings, f)

    print(f"✓ Embeddings saved to questions_embeddings.json")

if __name__ == '__main__':
    calculate_embeddings()
