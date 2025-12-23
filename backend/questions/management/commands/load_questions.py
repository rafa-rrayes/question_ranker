from django.core.management.base import BaseCommand
from questions.models import Question
import json
import os

class Command(BaseCommand):
    help = 'Load questions from JSON file'

    def handle(self, *args, **kwargs):
        from django.conf import settings
        json_path = os.path.join(settings.BASE_DIR, 'questions', 'questions_embeddings.json')

        self.stdout.write('Loading questions...')

        with open(json_path, 'r') as f:
            questions_data = json.load(f)

        Question.objects.all().delete()

        for item in questions_data:
            Question.objects.create(
                question_text=item['question'],
                answer=item['answer'],
                embedding=item['embedding']
            )

        self.stdout.write(self.style.SUCCESS(f'Successfully loaded {len(questions_data)} questions'))
