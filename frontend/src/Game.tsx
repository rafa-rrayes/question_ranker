import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { isAnswerCorrect } from '@/lib/fuzzyMatch';

import { getRankedQuestions, submitAnswers } from './api';
import { useAuth } from './AuthContext';
import GameHistory from './components/GameHistory';
import ReportDialog from './components/ReportDialog';
import type { Answer, GameResult, Question } from './types';

type GameState = 'input' | 'playing' | 'results';

const INITIAL_TIME = 30;
const TIME_BONUS = 5;
const MAX_TIME = 60;
const QUESTIONS_PER_GAME = 20;

const PRESET_CATEGORIES = [
  // Science & Nature
  'Science', 'Biology', 'Chemistry', 'Physics', 'Astronomy', 'Nature', 'Animals', 'Plants', 'Human Body', 'Space',
  // History & Geography
  'History', 'World History', 'Ancient History', 'Geography', 'Countries', 'Capitals', 'US History', 'European History', 'Wars', 'Civilizations',
  // Arts & Entertainment
  'Movies', 'Music', 'Art', 'Literature', 'Books', 'TV Shows', 'Celebrities', 'Theater', 'Pop Culture', 'Video Games',
  // Sports & Games
  'Sports', 'Football', 'Basketball', 'Soccer', 'Olympics', 'Baseball', 'Tennis', 'Chess', 'Board Games', 'Athletics',
  // Food & Lifestyle
  'Food', 'Cooking', 'Cuisine', 'Drinks', 'Fashion', 'Travel', 'Languages', 'Religion', 'Mythology', 'Holidays',
];

export default function Game() {
  const { user, token, logout } = useAuth();
  const [gameState, setGameState] = useState<GameState>('input');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);
  const [score, setScore] = useState(0);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [questionToReport, setQuestionToReport] = useState<Question | null>(null);
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercentage = (timeLeft / MAX_TIME) * 100;

  const finishGame = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const gameResult = await submitAnswers(query, answers, token);
      setResult(gameResult);
      setGameState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers');
    } finally {
      setLoading(false);
    }
  }, [token, answers, query]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !showFeedback) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      finishGame();
    }
  }, [gameState, timeLeft, showFeedback, finishGame]);

  useEffect(() => {
    if (gameState === 'playing' && !showFeedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentQuestionIndex, showFeedback]);

  const startGame = async (topic?: string) => {
    const gameQuery = topic || query;
    if (!gameQuery.trim() || !token) return;

    setQuery(gameQuery);
    setLoading(true);
    setError('');

    try {
      const rankedQuestions = await getRankedQuestions(gameQuery, token, QUESTIONS_PER_GAME);
      const finalQuestions = shuffleEnabled ? shuffleArray(rankedQuestions) : rankedQuestions;
      setQuestions(finalQuestions);
      setCurrentQuestionIndex(0);
      setCurrentAnswer('');
      setAnswers([]);
      setTimeLeft(INITIAL_TIME);
      setScore(0);
      setLastAnswerCorrect(null);
      setShowFeedback(false);
      setGameState('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    if (!currentQuestion || showFeedback) return;

    const isCorrect = isAnswerCorrect(currentAnswer, currentQuestion.answer);

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      answer: currentAnswer,
    };
    setAnswers((prev) => [...prev, newAnswer]);

    if (isCorrect) {
      setScore((s) => s + 1);
      setTimeLeft((t) => Math.min(t + TIME_BONUS, MAX_TIME));
    }

    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setCurrentAnswer('');

      if (isLastQuestion) {
        finishGame();
      } else {
        setCurrentQuestionIndex((i) => i + 1);
      }
    }, 1000);
  };

  const skipQuestion = () => {
    if (!currentQuestion || showFeedback) return;

    const newAnswer: Answer = {
      question_id: currentQuestion.id,
      answer: '',
    };
    setAnswers((prev) => [...prev, newAnswer]);

    setLastAnswerCorrect(false);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setCurrentAnswer('');

      if (isLastQuestion) {
        finishGame();
      } else {
        setCurrentQuestionIndex((i) => i + 1);
      }
    }, 1000);
  };

  const resetGame = () => {
    setGameState('input');
    setQuery('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setAnswers([]);
    setResult(null);
    setError('');
    setScore(0);
  };

  const openReportDialog = (question: Question) => {
    setQuestionToReport(question);
    setReportOpen(true);
  };

  const getProgressColor = () => {
    if (timeLeft <= 5) return 'bg-red-500';
    if (timeLeft <= 10) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Question Ranker
          </h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(true)}
            >
              History
            </Button>
            <span className="text-sm text-muted-foreground">
              Welcome,{' '}
              <span className="font-medium text-foreground">
                {user?.username}
              </span>
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {gameState === 'input' && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Start a New Game</CardTitle>
                <CardDescription>
                  Choose a category or enter your own topic. Answer {QUESTIONS_PER_GAME} questions
                  and get +5 seconds for each correct answer!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="query">Custom Topic</Label>
                  <div className="flex gap-3">
                    <Input
                      id="query"
                      type="text"
                      placeholder="Enter any topic..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startGame()}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => startGame()}
                      disabled={!query.trim() || loading}
                      className="px-8"
                    >
                      {loading ? 'Loading...' : 'Start'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffle"
                    checked={shuffleEnabled}
                    onCheckedChange={(checked) => setShuffleEnabled(checked === true)}
                  />
                  <Label
                    htmlFor="shuffle"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Shuffle questions (randomize order)
                  </Label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or choose a category
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant="outline"
                      size="sm"
                      onClick={() => startGame(category)}
                      disabled={loading}
                      className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950 dark:hover:text-purple-300 dark:hover:border-purple-700 transition-colors"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="space-y-6">
            {/* Header with score and timer */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-base px-4 py-1">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-base px-4 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                >
                  Score: {score}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">{timeLeft}s</div>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <Progress
                value={progressPercentage}
                className="h-3"
                indicatorClassName={getProgressColor()}
              />
              {showFeedback && lastAnswerCorrect && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium animate-pulse">
                  +{TIME_BONUS} seconds!
                </p>
              )}
            </div>

            {/* Question card */}
            <Card
              className={`shadow-lg transition-all duration-300 ${
                showFeedback
                  ? lastAnswerCorrect
                    ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950'
                    : 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950'
                  : ''
              }`}
            >
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xl font-medium leading-relaxed flex-1">
                      {currentQuestion.question_text}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => openReportDialog(currentQuestion)}
                    >
                      Report
                    </Button>
                  </div>

                  {showFeedback ? (
                    <div className="space-y-3">
                      <div
                        className={`text-lg font-semibold ${
                          lastAnswerCorrect
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {lastAnswerCorrect ? 'Correct!' : 'Incorrect'}
                      </div>
                      {!lastAnswerCorrect && (
                        <p className="text-muted-foreground">
                          The answer was:{' '}
                          <span className="font-semibold text-foreground">
                            {currentQuestion.answer}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Type your answer..."
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                        className="flex-1 text-lg py-6"
                        autoComplete="off"
                      />
                      <Button
                        onClick={submitAnswer}
                        disabled={!currentAnswer.trim()}
                        size="lg"
                        className="px-8"
                      >
                        Submit
                      </Button>
                      <Button
                        onClick={skipQuestion}
                        variant="outline"
                        size="lg"
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Question progress dots */}
            <div className="flex justify-center gap-1.5 flex-wrap">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index < currentQuestionIndex
                      ? answers[index]?.answer &&
                        isAnswerCorrect(
                          answers[index].answer,
                          questions[index].answer
                        )
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : index === currentQuestionIndex
                      ? 'bg-purple-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {gameState === 'results' && result && (
          <Card className="shadow-lg text-center">
            <CardHeader>
              <CardTitle className="text-3xl">Game Over!</CardTitle>
              <CardDescription>
                Here's how you did on "{result.query}"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="py-8">
                <div className="text-7xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {score} / {questions.length}
                </div>
                <p className="text-lg text-muted-foreground mt-2">
                  {score === questions.length
                    ? 'Perfect score! Amazing!'
                    : score >= questions.length / 2
                    ? 'Good job! Keep practicing!'
                    : 'Keep trying, you can do better!'}
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={resetGame} size="lg" className="px-12">
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setHistoryOpen(true)}
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* History Dialog */}
      {token && (
        <GameHistory
          token={token}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}

      {/* Report Dialog */}
      {token && (
        <ReportDialog
          question={questionToReport}
          token={token}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </div>
  );
}
