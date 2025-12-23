import type { Answer, AuthResponse, GameResult, Question, QuestionReport, ReportType } from './types';

const API_URL = 'http://localhost:8000/api';

export const signup = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/signup/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  return response.json();
};

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

export const getRankedQuestions = async (
  query: string,
  token: string,
  limit: number = 10
): Promise<Question[]> => {
  const response = await fetch(`${API_URL}/questions/ranked/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, limit }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get questions');
  }

  return response.json();
};

export const submitAnswers = async (
  query: string,
  answers: Answer[],
  token: string
): Promise<GameResult> => {
  const response = await fetch(`${API_URL}/questions/submit/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit answers');
  }

  return response.json();
};

export const getGameHistory = async (token: string): Promise<GameResult[]> => {
  const response = await fetch(`${API_URL}/questions/history/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get game history');
  }

  return response.json();
};

export const getGameDetail = async (sessionId: number, token: string): Promise<GameResult> => {
  const response = await fetch(`${API_URL}/questions/history/${sessionId}/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get game details');
  }

  return response.json();
};

export const reportQuestion = async (
  questionId: number,
  reportType: ReportType,
  description: string,
  token: string
): Promise<QuestionReport> => {
  const response = await fetch(`${API_URL}/questions/report/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question_id: questionId,
      report_type: reportType,
      description,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to report question');
  }

  return response.json();
};
