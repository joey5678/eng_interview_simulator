export interface AudioState {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
}

export interface Feedback {
  contentScore: number;
  fluencyScore: number;
  grammarScore: number;
  overallScore: number;
  feedback: string;
  suggestions?: string; // 添加建议字段
}

export interface UserAnswerProps {
  userAnswer: string;
  translatedText: string;
  isRecording: boolean;
  isLoading: boolean;
  feedback: Feedback | null;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onTranslate: () => Promise<void>;
  onSubmit: () => Promise<void>;
}

export interface FeedbackSectionProps {
  feedback: Feedback;
  onNext: () => void;
}

export interface ASRResponse {
  text: string;
  status: number;
}

export interface TranslationResponse {
  response: string;
}

export interface OllamaResponse {
  response: string;
}