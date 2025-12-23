export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface Question {
  id: number;
  question_text: string;
  answer: string;
}

export interface Answer {
  question_id: number;
  answer: string;
}

export interface GameAnswer {
  id: number;
  question: number;
  question_text: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  answered_at: string;
}

export interface GameResult {
  id: number;
  query: string;
  score: number;
  total_questions: number;
  created_at: string;
  answers?: GameAnswer[];
}

export type ReportType = 'wrong_answer' | 'repeated' | 'unclear' | 'inappropriate' | 'other';

export interface QuestionReport {
  id: number;
  question: number;
  report_type: ReportType;
  description: string;
  created_at: string;
}
