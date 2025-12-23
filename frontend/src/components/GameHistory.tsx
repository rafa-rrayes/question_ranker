import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getGameDetail, getGameHistory } from '../api';
import type { GameResult } from '../types';

interface GameHistoryProps {
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GameHistory({ token, open, onOpenChange }: GameHistoryProps) {
  const [games, setGames] = useState<GameResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const history = await getGameHistory(token);
      setGames(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const viewGameDetail = async (gameId: number) => {
    setLoading(true);
    try {
      const detail = await getGameDetail(gameId, token);
      setSelectedGame(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {selectedGame ? 'Game Details' : 'Game History'}
          </DialogTitle>
          <DialogDescription>
            {selectedGame
              ? `Review your answers for "${selectedGame.query}"`
              : 'View your past games and scores'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && !selectedGame && games.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No games played yet. Start a new game!
            </div>
          )}

          {!loading && !error && !selectedGame && games.length > 0 && (
            <div className="space-y-3">
              {games.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => viewGameDetail(game.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{game.query}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(game.created_at)}
                        </p>
                      </div>
                      <Badge className={getScoreColor(game.score, game.total_questions)}>
                        {game.score} / {game.total_questions}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && selectedGame && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGame(null)}
                >
                  &larr; Back to history
                </Button>
                <Badge className={getScoreColor(selectedGame.score, selectedGame.total_questions)}>
                  Score: {selectedGame.score} / {selectedGame.total_questions}
                </Badge>
              </div>

              <div className="space-y-3">
                {selectedGame.answers?.map((answer, index) => (
                  <Card
                    key={answer.id}
                    className={
                      answer.is_correct
                        ? 'border-green-200 dark:border-green-800'
                        : 'border-red-200 dark:border-red-800'
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-muted-foreground">#{index + 1}</span>
                        {answer.question_text}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Your answer:</p>
                          <p
                            className={
                              answer.is_correct
                                ? 'text-green-600 dark:text-green-400 font-medium'
                                : 'text-red-600 dark:text-red-400 font-medium'
                            }
                          >
                            {answer.user_answer || '(skipped)'}
                          </p>
                        </div>
                        {!answer.is_correct && (
                          <div>
                            <p className="text-muted-foreground">Correct answer:</p>
                            <p className="font-medium">{answer.correct_answer}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
