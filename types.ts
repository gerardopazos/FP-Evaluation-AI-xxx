
export enum QuestionType {
  TEORICA = 'Teórica',
  PRACTICA = 'Práctica/Esquema',
  SCRIPT = 'Script/Comando',
  TEST = 'Test'
}

export interface QuestionTemplate {
  id: number;
  type: QuestionType;
  points: number;
  prompt: string;
  solution: string;
  criteria: string[];
  fatalErrors: string[];
}

export interface CorrectionResult {
  question_id: number;
  score: number;
  feedback: string;
  conceptual_error: boolean;
  manual_review_needed: boolean;
}

export interface StudentExam {
  id: string;
  studentName: string;
  pages: string[]; // Base64 images
  corrections: CorrectionResult[];
  totalScore: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: number;
}

export interface AppState {
  template: QuestionTemplate[];
  exams: StudentExam[];
  systemPrompt: string;
}
