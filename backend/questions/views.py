import numpy as np
from dotenv import load_dotenv
from openai import OpenAI
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Answer, GameSession, Question, QuestionReport
from .serializers import (
    GameSessionListSerializer,
    GameSessionSerializer,
    QuestionReportSerializer,
    QuestionSerializer,
)

load_dotenv()
client = OpenAI()


def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def levenshtein_distance(a: str, b: str) -> int:
    """Calculate the Levenshtein distance between two strings."""
    if len(a) < len(b):
        return levenshtein_distance(b, a)

    if len(b) == 0:
        return len(a)

    previous_row = range(len(b) + 1)
    for i, c1 in enumerate(a):
        current_row = [i + 1]
        for j, c2 in enumerate(b):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def is_answer_correct(user_answer: str, correct_answer: str, max_distance: int = 2) -> bool:
    """Check if answer is correct, allowing for minor typos."""
    normalized_user = user_answer.strip().lower()
    normalized_correct = correct_answer.strip().lower()

    if normalized_user == normalized_correct:
        return True

    if len(normalized_user) == 0:
        return False

    return levenshtein_distance(normalized_user, normalized_correct) <= max_distance


class RankedQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query', '')
        limit = request.data.get('limit', 20)

        if not query:
            return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = client.embeddings.create(
                input=query,
                model="text-embedding-3-small"
            )
            query_embedding = response.data[0].embedding

            questions = Question.objects.all()
            scored_questions = []

            for question in questions:
                similarity = cosine_similarity(query_embedding, question.embedding)
                scored_questions.append((question, similarity))

            scored_questions.sort(key=lambda x: x[1], reverse=True)
            top_questions = [q[0] for q in scored_questions[:limit]]

            serializer = QuestionSerializer(top_questions, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubmitAnswersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get('query', '')
        answers = request.data.get('answers', [])

        if not query or not answers:
            return Response({'error': 'Query and answers are required'}, status=status.HTTP_400_BAD_REQUEST)

        session = GameSession.objects.create(
            user=request.user,
            query=query,
            total_questions=len(answers)
        )

        score = 0
        for answer_data in answers:
            question_id = answer_data.get('question_id')
            user_answer = answer_data.get('answer', '')

            try:
                question = Question.objects.get(id=question_id)
                correct = is_answer_correct(user_answer, question.answer)
                if correct:
                    score += 1

                Answer.objects.create(
                    session=session,
                    question=question,
                    user_answer=user_answer.strip().lower(),
                    is_correct=correct
                )
            except Question.DoesNotExist:
                continue

        session.score = score
        session.save()

        serializer = GameSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GameHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get user's game history."""
        sessions = GameSession.objects.filter(user=request.user)[:20]
        serializer = GameSessionListSerializer(sessions, many=True)
        return Response(serializer.data)


class GameDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        """Get details of a specific game session."""
        try:
            session = GameSession.objects.get(id=session_id, user=request.user)
            serializer = GameSessionSerializer(session)
            return Response(serializer.data)
        except GameSession.DoesNotExist:
            return Response({'error': 'Game session not found'}, status=status.HTTP_404_NOT_FOUND)


class ReportQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Report a question for review."""
        question_id = request.data.get('question_id')
        report_type = request.data.get('report_type')
        description = request.data.get('description', '')

        if not question_id or not report_type:
            return Response(
                {'error': 'question_id and report_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_types = [choice[0] for choice in QuestionReport.REPORT_TYPES]
        if report_type not in valid_types:
            return Response(
                {'error': f'Invalid report_type. Must be one of: {valid_types}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if user already reported this question with same type
        existing = QuestionReport.objects.filter(
            user=request.user,
            question=question,
            report_type=report_type
        ).exists()

        if existing:
            return Response(
                {'error': 'You have already reported this question for the same reason'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report = QuestionReport.objects.create(
            user=request.user,
            question=question,
            report_type=report_type,
            description=description
        )

        serializer = QuestionReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
