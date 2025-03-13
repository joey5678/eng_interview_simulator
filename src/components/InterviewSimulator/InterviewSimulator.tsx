import React, { useState, useEffect, useRef, useCallback } from 'react';
import InterviewQuestion from '../InterviewQuestion';
import UserAnswer from '../UserAnswer';
import FeedbackSection from '../FeedbackSection';
import type { Feedback } from '../../types/index';

interface AudioChunk extends Blob {
  type: string;
}

const InterviewSimulator: React.FC = () => {
  // 状态管理
  const [translatedText, setTranslatedText] = useState<string>('');
  const [interviewStarted, setInterviewStarted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [accumulatedText, setAccumulatedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 3;

  // 初始化面试问题
  const sampleQuestions = [
    "Tell me about yourself.",
    "Why do you want to work for this company?",
    "Where do you see yourself in five years?",
    "Describe a challenging situation you faced at work and how you handled it."
  ];

  useEffect(() => {
    setQuestions(sampleQuestions);
  }, []);

  // 开始面试
  const startInterview = useCallback(() => {
    setInterviewStarted(true);
    setCurrentQuestion(questions[0]);
    setCurrentQuestionIndex(0);
    setFeedback(null);
  }, [questions]);

  // 下一个问题
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setCurrentQuestion(questions[currentQuestionIndex + 1]);
      resetAnswerState();
    } else {
      endInterview();
    }
  }, [currentQuestionIndex, questions.length]);

  const resetAnswerState = () => {
    setUserAnswer('');
    setAccumulatedText('');
    setTranslatedText('');
    setFeedback(null);
  };

  const endInterview = () => {
    setInterviewStarted(false);
    setCurrentQuestion('Interview completed! Thank you for your participation.');
    resetAnswerState();
  };

  // 录音相关函数
  const startRecording = async (retryCount: number = 0) => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks: AudioChunk[] = [];
      const startTime = Date.now();

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = Date.now() - startTime;
        if (duration < 1000 || audioChunks.length === 0) {
          console.warn('录音时间过短或没有音频数据');
          return;
        }
        await handleRecordingStop(audioChunks);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setUserAnswer(accumulatedText);
    } catch (error) {
      handleRecordingError(error as Error, retryCount);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordingStop = async (audioChunks: AudioChunk[]) => {
    if (audioChunks.length === 0) {
      console.warn('没有有效的音频数据');
      return;
    }
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    if (audioBlob.size < 1000) {
      console.warn('音频数据太小，可能没有有效内容');
      return;
    }
    
    setAudioBlob(audioBlob);
    await sendAudioToASR(audioBlob);
  };

  const sendAudioToASR = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await fetch('/asr?output=json', {
        method: 'POST',
        body: formData,
        headers: { 
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ASR服务错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data || !data.text) {
        console.warn('ASR服务返回空结果，可能没有检测到语音');
        return;
      }
      updateTranscriptText(data.text);
    } catch (error) {
      console.error('ASR服务错误:', error);
      handleASRError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleASRError = (error: Error | unknown) => {
    console.error('ASR服务错误:', error);
    alert('语音识别服务暂时不可用，请检查服务是否正常运行，或稍后重试。');
    setIsRecording(false);
    setIsPaused(false);
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('停止录音时出错:', e);
      }
    }
  };

  const handleRecordingError = (error: Error, retryCount: number) => {
    console.error('录音错误:', error);
    if (retryCount < MAX_RETRIES) {
      retryTimeoutRef.current = setTimeout(() => {
        startRecording(retryCount + 1);
      }, 1000 * (retryCount + 1));
    } else {
      alert('无法启动录音，请检查麦克风权限和设备状态。');
    }
  };

  const updateTranscriptText = (text: string) => {
    if (text && text.trim()) {
      const newText = (prev: string) => prev ? `${prev} ${text.trim()}` : text.trim();
      setAccumulatedText(newText);
      setUserAnswer(newText);
      translateWithText(newText(''));
    }
  };

  const translateWithText = async (text: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_OLLAMA_SERVICE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: import.meta.env.VITE_OLLAMA_MODEL,
          prompt: `Translate the following English text to Chinese: ${text}`,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('翻译服务请求失败');
      }

      const data = await response.json();
      setTranslatedText(prev => {
        return prev ? `${prev}\n${data.response}` : data.response;
      });
    } catch (error) {
      console.error('翻译失败:', error);
      alert('翻译失败，请确保翻译服务正常运行');
    } finally {
      setIsLoading(false);
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getFeedback = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_OLLAMA_SERVICE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: import.meta.env.VITE_OLLAMA_MODEL,
          prompt: `作为英语面试教练，请评估以下回答：\n\n问题：${currentQuestion}\n回答：${userAnswer}\n\n请从以下几个方面进行分析：\n1. 亮点（列出2-3个优点）\n2. 改进建议（列出2-3个具体建议）\n3. 总体评价（100字以内）`,
          stream: false
        })
      });

      if (!response.ok) throw new Error('评估请求失败');

      const data = await response.json();
      setFeedback(JSON.parse(data.response));
    } catch (error) {
      console.error('获取反馈失败:', error);
      alert('获取反馈失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建一个包装函数来处理翻译
  const handleTranslate = useCallback(async () => {
    if (userAnswer) {
      await translateWithText(userAnswer);
    }
  }, [userAnswer]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI 英语面试助手</h1>
        {!interviewStarted && (
          <button className="start-button" onClick={startInterview}>
            开始面试
          </button>
        )}
      </header>

      {interviewStarted && (
        <div className="interview-container">
          <InterviewQuestion question={currentQuestion} />
          <UserAnswer
            userAnswer={userAnswer}
            translatedText={translatedText}
            isRecording={isRecording}
            isLoading={isLoading}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            feedback={feedback}
            onTranslate={handleTranslate}
            onSubmit={getFeedback}
          />
          {feedback && (
            <FeedbackSection
              feedback={feedback}
              onNext={nextQuestion}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewSimulator;