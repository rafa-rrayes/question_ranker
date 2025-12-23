from rest_framework import serializers

from .models import Answer, GameSession, Question, QuestionReport


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'answer']


class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    correct_answer = serializers.CharField(source='question.answer', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'question', 'question_text', 'correct_answer', 'user_answer', 'is_correct', 'answered_at']


class GameSessionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = GameSession
        fields = ['id', 'query', 'score', 'total_questions', 'created_at', 'answers']


class GameSessionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view without nested answers"""
    class Meta:
        model = GameSession
        fields = ['id', 'query', 'score', 'total_questions', 'created_at']


class QuestionReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionReport
        fields = ['id', 'question', 'report_type', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']
