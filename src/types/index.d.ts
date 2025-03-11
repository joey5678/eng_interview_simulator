interface Feedback {
  contentScore: number;
  fluencyScore: number;
  grammarScore: number;
  overallScore: number;
  feedback: string;
}

interface InterviewQuestionProps {
  question: string;
}

interface UserAnswerProps {
  userAnswer: string;
  translatedText: string;
  isRecording: boolean;
  isPaused: boolean;
  isLoading: boolean;
  feedback: Feedback | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onTranslate: () => void;
  onSubmit: () => void;
}

interface FeedbackSectionProps {
  feedback: Feedback;
  onNext: () => void;
}