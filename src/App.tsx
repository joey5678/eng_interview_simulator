import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import InterviewQuestion from './components/InterviewQuestion';
import UserAnswer from './components/UserAnswer';
import FeedbackSection from './components/FeedbackSection';
import type { Feedback} from './types/index';

interface AudioChunk extends Blob {
  type: string;
}

const App: React.FC = () => {
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

  // 初始化面试
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

  const handleRecordingStop = async (audioChunks: AudioChunk[]) => {
    if (audioChunks.length === 0) {
      console.warn('没有有效的音频数据');
      return;
    }
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    if (audioBlob.size < 1000) {  // 检查音频大小是否小于1KB
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
      // 重置录音状态
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };



  // 修改 updateTranscriptText 函数
  const updateTranscriptText = (text: string) => {
    if (text && text.trim()) {
      const newText = (prev: string) => prev ? `${prev} ${text.trim()}` : text.trim();
      
      setAccumulatedText(newText);
      setUserAnswer(newText);

      // 添加延时自动翻译，使用最新的文本
      setTimeout(() => {
        const textToTranslate = newText('');
        translateWithText(textToTranslate);
      }, 2000);
    }
  };

  // 新增一个接收文本参数的翻译函数
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
      // 修改这里：累加翻译结果而不是替换
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

  // 修改原有的 translateText 函数
  const translateText = async () => {
    await translateWithText(userAnswer);
  };

  const submitAnswer = async () => {
    setIsLoading(true);
    try {
      if (isRecording) {
        await stopRecording();
      }

      // 获取 LLM 建议
      const suggestionResponse = await fetch(`${import.meta.env.VITE_OLLAMA_SERVICE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: import.meta.env.VITE_OLLAMA_MODEL,
          prompt: `你是一位专业的英语面试官。
问题：${currentQuestion}
考生回答：${userAnswer}

请从以下几个方面给出专业的改进建议：
1. 内容相关性和完整性
2. 语言表达和语法
3. 专业术语使用
4. 整体表现

请用中文回答，以要点形式列出具体的改进建议。`,
          stream: false
        })
      });

      if (!suggestionResponse.ok) {
        throw new Error('获取建议失败');
      }

      const suggestionData = await suggestionResponse.json();
      
      // 构建反馈数据
      const mockFeedback: Feedback = {
        contentScore: Math.floor(Math.random() * 3) + 7,
        fluencyScore: Math.floor(Math.random() * 3) + 7,
        grammarScore: Math.floor(Math.random() * 3) + 7,
        overallScore: Math.floor(Math.random() * 3) + 7,
        feedback: "Your answer was well-structured and showed good understanding of the topic.",
        suggestions: suggestionData.response
      };

      setFeedback(mockFeedback);
    } catch (error) {
      console.error('提交答案失败:', error);
      alert('提交答案失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>英语面试模拟器</h1>
        {!interviewStarted && (
          <button 
            className="start-button" 
            onClick={startInterview}
            disabled={isLoading}
          >
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
            feedback={feedback}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onTranslate={translateText}
            onSubmit={submitAnswer}
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

export default App;

 