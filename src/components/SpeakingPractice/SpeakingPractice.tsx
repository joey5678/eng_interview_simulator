import React, { useState, useRef, useEffect } from 'react';
import './SpeakingPractice.css';

interface AudioChunk extends Blob {
  type: string;
}

interface PracticeFeedback {
  highlights: string[];
  suggestions: string[];
  overallComment: string;
}

const SpeakingPractice: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [accumulatedText, setAccumulatedText] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // 移除未使用的状态
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 3;

  // 添加 handleQuestionSubmit 函数
  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setUserAnswer('');
    setTranslatedText('');
  };

  // 修改录音相关函数的类型
  const handleStartRecording = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await startRecording();
  };

  const handleStopRecording = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    stopRecording();
  };

  // 删除这里重复声明的状态
  
  // 添加录音相关函数
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
          prompt: `你是一位英语口语教练。请评估以下回答并以JSON格式返回评估结果。
问题：${question}
回答：${userAnswer}

请提供以下内容：
1. 2-3个优点
2. 2-3个改进建议
3. 100字以内的总体评价

严格按照以下JSON格式返回：
{"highlights":["优点1","优点2"],"suggestions":["建议1","建议2"],"overallComment":"总体评价"}`,
          stream: false
        })
      });

      if (!response.ok) throw new Error('评估请求失败');

      const data = await response.json();
      
      // 尝试解析返回的文本为JSON
      try {
        let feedbackData;
        if (typeof data.response === 'string') {
          // 清理可能的多余字符
          const cleanJson = data.response.replace(/```json\n?|\n?```/g, '').trim();
          feedbackData = JSON.parse(cleanJson);
        } else {
          feedbackData = data.response;
        }
        
        // 验证数据结构
        if (!feedbackData.highlights || !feedbackData.suggestions || !feedbackData.overallComment) {
          throw new Error('返回数据格式不正确');
        }
        
        setFeedback(feedbackData);
      } catch (parseError) {
        console.error('解析反馈数据失败:', parseError);
        throw new Error('无法解析AI返回的反馈数据');
      }
    } catch (error) {
      console.error('获取反馈失败:', error);
      alert('获取反馈失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="speaking-practice">
      <h1>口语训练</h1>
      
      <form onSubmit={handleQuestionSubmit} className="question-form">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入你想练习的问题..."
          required
        />
        <button type="submit">确认</button>
      </form>

      {question && (
        <div className="practice-container">
          <div className="question-display">
            <h2>练习问题：</h2>
            <p>{question}</p>
          </div>

          <div className="answer-section">
            <h2>你的回答：</h2>
            <div className="answer-box">
              <h3>英文回答：</h3>
              <p>{userAnswer || "点击下方按钮开始回答"}</p>
            </div>
            {translatedText && (
              <div className="answer-box">
                <h3>中文翻译：</h3>
                <p>{translatedText}</p>
              </div>
            )}
          </div>

          <div className="controls">
            {isLoading ? (
              <div className="loading">处理中...</div>
            ) : (
              <>
                <button
                  className={`record-button ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={!question}
                >
                  {isRecording ? '停止录音' : '开始回答'}
                </button>
                {userAnswer && (
                  <button
                    className="evaluate-button"
                    onClick={getFeedback}
                    disabled={isLoading}
                  >
                    获取反馈
                  </button>
                )}
              </>
            )}
          </div>

          {feedback && (
            <div className="feedback-section">
              <h2>评估反馈</h2>
              <div className="highlights">
                <h3>亮点：</h3>
                <ul>
                  {feedback.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
              <div className="suggestions">
                <h3>改进建议：</h3>
                <ul>
                  {feedback.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
              <div className="overall-comment">
                <h3>总体评价：</h3>
                <p>{feedback.overallComment}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpeakingPractice;