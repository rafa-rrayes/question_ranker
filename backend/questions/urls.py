from django.urls import path

from .views import (
    GameDetailView,
    GameHistoryView,
    RankedQuestionsView,
    ReportQuestionView,
    SubmitAnswersView,
)

urlpatterns = [
    path('ranked/', RankedQuestionsView.as_view(), name='ranked-questions'),
    path('submit/', SubmitAnswersView.as_view(), name='submit-answers'),
    path('history/', GameHistoryView.as_view(), name='game-history'),
    path('history/<int:session_id>/', GameDetailView.as_view(), name='game-detail'),
    path('report/', ReportQuestionView.as_view(), name='report-question'),
]
