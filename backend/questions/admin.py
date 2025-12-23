from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, User
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import escape, format_html, mark_safe

from .models import Answer, GameSession, Question, QuestionReport


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'question_text_short', 'answer', 'times_answered', 'accuracy_rate', 'report_count']
    list_filter = ['id']
    search_fields = ['question_text', 'answer']
    readonly_fields = ['embedding', 'stats_display']
    fieldsets = (
        (None, {
            'fields': ('question_text', 'answer')
        }),
        ('Statistics', {
            'fields': ('stats_display',),
            'classes': ('collapse',)
        }),
        ('Technical', {
            'fields': ('embedding',),
            'classes': ('collapse',)
        }),
    )

    def question_text_short(self, obj):
        return obj.question_text[:80] + '...' if len(obj.question_text) > 80 else obj.question_text
    question_text_short.short_description = 'Question'

    def times_answered(self, obj):
        return obj.user_answers.count()
    times_answered.short_description = 'Times Answered'

    def accuracy_rate(self, obj):
        answers = obj.user_answers.all()
        total = answers.count()
        if total == 0:
            return '-'
        correct = answers.filter(is_correct=True).count()
        rate = (correct / total) * 100
        color = 'green' if rate >= 70 else 'orange' if rate >= 40 else 'red'
        return format_html('<span style="color: {};">{}</span>', color, f'{rate:.1f}%')
    accuracy_rate.short_description = 'Accuracy'

    def report_count(self, obj):
        count = obj.reports.filter(resolved=False).count()
        if count > 0:
            return format_html('<span style="color: red; font-weight: bold;">{}</span>', count)
        return 0
    report_count.short_description = 'Open Reports'

    def stats_display(self, obj):
        answers = obj.user_answers.all()
        total = answers.count()
        correct = answers.filter(is_correct=True).count()
        return f"Total answers: {total}, Correct: {correct}, Incorrect: {total - correct}"
    stats_display.short_description = 'Answer Statistics'


@admin.register(QuestionReport)
class QuestionReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'question_short', 'report_type', 'user', 'created_at', 'resolved', 'resolve_action']
    list_filter = ['report_type', 'resolved', 'created_at']
    search_fields = ['question__question_text', 'description', 'user__username']
    readonly_fields = ['user', 'question', 'report_type', 'description', 'created_at']
    list_editable = ['resolved']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    actions = ['mark_resolved', 'mark_unresolved']

    fieldsets = (
        ('Report Details', {
            'fields': ('user', 'question', 'report_type', 'description', 'created_at')
        }),
        ('Status', {
            'fields': ('resolved',)
        }),
    )

    def question_short(self, obj):
        text = obj.question.question_text
        return text[:60] + '...' if len(text) > 60 else text
    question_short.short_description = 'Question'

    def resolve_action(self, obj):
        if obj.resolved:
            return mark_safe('<span style="color: green;">✓ Resolved</span>')
        return mark_safe('<span style="color: orange;">⏳ Pending</span>')
    resolve_action.short_description = 'Status'

    @admin.action(description='Mark selected reports as resolved')
    def mark_resolved(self, request, queryset):
        updated = queryset.update(resolved=True)
        self.message_user(request, f'{updated} reports marked as resolved.')

    @admin.action(description='Mark selected reports as unresolved')
    def mark_unresolved(self, request, queryset):
        updated = queryset.update(resolved=False)
        self.message_user(request, f'{updated} reports marked as unresolved.')


@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'query', 'score_display', 'total_questions', 'created_at']
    list_filter = ['created_at', 'user']
    search_fields = ['query', 'user__username']
    readonly_fields = ['user', 'query', 'score', 'total_questions', 'created_at', 'answers_display']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    fieldsets = (
        ('Game Info', {
            'fields': ('user', 'query', 'created_at')
        }),
        ('Results', {
            'fields': ('score', 'total_questions')
        }),
        ('Answers', {
            'fields': ('answers_display',),
            'classes': ('collapse',)
        }),
    )

    def score_display(self, obj):
        if obj.total_questions == 0:
            return '-'
        percentage = (obj.score / obj.total_questions) * 100
        color = 'green' if percentage >= 70 else 'orange' if percentage >= 40 else 'red'
        return format_html(
            '<span style="color: {};">{}/{} ({})</span>',
            color, obj.score, obj.total_questions, f'{percentage:.0f}%'
        )
    score_display.short_description = 'Score'

    def answers_display(self, obj):
        answers = obj.answers.all()
        if not answers:
            return 'No answers recorded'

        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<tr><th style="text-align:left; padding:5px; border-bottom:1px solid #ddd;">Question</th>'
        html += '<th style="text-align:left; padding:5px; border-bottom:1px solid #ddd;">User Answer</th>'
        html += '<th style="text-align:left; padding:5px; border-bottom:1px solid #ddd;">Correct</th></tr>'

        for answer in answers:
            color = 'green' if answer.is_correct else 'red'
            icon = '✓' if answer.is_correct else '✗'
            question_text = escape(answer.question.question_text[:50])
            user_answer = escape(answer.user_answer) if answer.user_answer else "(skipped)"
            html += f'<tr>'
            html += f'<td style="padding:5px; border-bottom:1px solid #eee;">{question_text}...</td>'
            html += f'<td style="padding:5px; border-bottom:1px solid #eee;">{user_answer}</td>'
            html += f'<td style="padding:5px; border-bottom:1px solid #eee; color:{color};">{icon}</td>'
            html += '</tr>'

        html += '</table>'
        return mark_safe(html)
    answers_display.short_description = 'Answers'


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'question_short', 'user_answer', 'is_correct', 'answered_at']
    list_filter = ['is_correct', 'answered_at']
    search_fields = ['question__question_text', 'user_answer']
    readonly_fields = ['session', 'question', 'user_answer', 'is_correct', 'answered_at']

    def question_short(self, obj):
        text = obj.question.question_text
        return text[:50] + '...' if len(text) > 50 else text
    question_short.short_description = 'Question'


class QuestionRankerAdminSite(admin.AdminSite):
    site_header = 'Question Ranker Admin'
    site_title = 'Question Ranker'
    index_title = 'Dashboard'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('stats/', self.admin_view(self.stats_view), name='stats'),
        ]
        return custom_urls + urls

    def stats_view(self, request):
        # Get date range (last 30 days)
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=30)

        # Daily game stats
        daily_games = (
            GameSession.objects
            .filter(created_at__gte=start_date)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                count=Count('id'),
                avg_score=Avg('score')
            )
            .order_by('date')
        )

        # Overall stats
        total_games = GameSession.objects.count()
        total_users = GameSession.objects.values('user').distinct().count()
        total_questions = Question.objects.count()
        total_answers = Answer.objects.count()

        # Reports stats
        open_reports = QuestionReport.objects.filter(resolved=False).count()
        total_reports = QuestionReport.objects.count()

        # Report breakdown by type
        report_types = (
            QuestionReport.objects
            .filter(resolved=False)
            .values('report_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Most played topics
        top_topics = (
            GameSession.objects
            .values('query')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Most difficult questions (lowest accuracy)
        difficult_questions = []
        for q in Question.objects.annotate(answer_count=Count('user_answers')).filter(answer_count__gte=5):
            total = q.user_answers.count()
            correct = q.user_answers.filter(is_correct=True).count()
            accuracy = (correct / total) * 100 if total > 0 else 0
            difficult_questions.append({
                'question': q,
                'accuracy': accuracy,
                'total': total
            })
        difficult_questions.sort(key=lambda x: x['accuracy'])
        difficult_questions = difficult_questions[:10]

        # Recent activity
        recent_games = GameSession.objects.order_by('-created_at')[:10]

        context = {
            **self.each_context(request),
            'title': 'Traffic Statistics',
            'daily_games': list(daily_games),
            'total_games': total_games,
            'total_users': total_users,
            'total_questions': total_questions,
            'total_answers': total_answers,
            'open_reports': open_reports,
            'total_reports': total_reports,
            'report_types': list(report_types),
            'top_topics': list(top_topics),
            'difficult_questions': difficult_questions,
            'recent_games': recent_games,
        }

        return TemplateResponse(request, 'admin/stats.html', context)


# Create custom admin site instance
admin_site = QuestionRankerAdminSite(name='question_ranker_admin')

# Register models with custom admin site
admin_site.register(Question, QuestionAdmin)
admin_site.register(QuestionReport, QuestionReportAdmin)
admin_site.register(GameSession, GameSessionAdmin)
admin_site.register(Answer, AnswerAdmin)

# Register auth models
admin_site.register(User, UserAdmin)
admin_site.register(Group)
