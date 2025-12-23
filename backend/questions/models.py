from django.db import models
from django.contrib.auth.models import User
import json

class Question(models.Model):
    question_text = models.TextField()
    answer = models.TextField()
    embedding = models.JSONField()

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.question_text


class GameSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    query = models.TextField()
    score = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.score}/{self.total_questions}"


class Answer(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='user_answers')
    user_answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.session.user.username} - {self.question.question_text[:50]}"


class QuestionReport(models.Model):
    REPORT_TYPES = [
        ('wrong_answer', 'Wrong Answer'),
        ('repeated', 'Repeated Question'),
        ('unclear', 'Unclear Question'),
        ('inappropriate', 'Inappropriate Content'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} reported: {self.question.question_text[:30]}"
