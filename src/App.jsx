import React, { useState, useEffect, useRef } from 'react'; // Add useRef here
import './App.css';

const App = () => {
  // 状态管理
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // 模拟面试问题
  const sampleQuestions = [
    "Tell me about yourself.",
    "What are your strengths and weaknesses?",
    "Why do you want to work for this company?",
    "Where do you see yourself in five years?",
    "Describe a challenging situation you faced at work and how you handled it."
  ];

  // 初始化面试
  useEffect(() => {
    setQuestions(sampleQuestions);
  }, []);

  // 开始面试
  const startInterview = () => {
    setInterviewStarted(true);
    setCurrentQuestion(questions[0]);
    setCurrentQuestionIndex(0);
    setFeedback(null);
  };

  // 下一个问题
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setCurrentQuestion(questions[currentQuestionIndex + 1]);
      setUserAnswer('');
      setFeedback(null);
    } else {
      // 面试结束
      setInterviewStarted(false);
      setCurrentQuestion('Interview completed! Thank you for your participation.');
    }
  };

  // 语音识别相关变量
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState('');

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        setUserAnswer(currentTranscript);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        
        // 提供更详细的错误信息和用户提示
        let errorMessage = '';
        switch(event.error) {
          case 'not-allowed':
            errorMessage = '麦克风访问被拒绝。请确保您已授予浏览器麦克风访问权限。';
            break;
          case 'no-speech':
            errorMessage = '未检测到语音。请确保您的麦克风正常工作并尝试再次说话。';
            break;
          case 'network':
            errorMessage = '网络错误导致语音识别失败。请检查您的网络连接。';
            break;
          case 'aborted':
            errorMessage = '语音识别被中断。';
            break;
          case 'audio-capture':
            errorMessage = '无法捕获音频。请确保您的设备有可用的麦克风。';
            break;
          case 'service-not-allowed':
            errorMessage = '浏览器不允许使用语音识别服务。请尝试使用Chrome或Edge浏览器。';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}。请刷新页面重试。`;
        }
        
        // 显示错误提示
        alert(errorMessage);
      };

      setRecognition(recognitionInstance);
    } else {
      alert('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器。');
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // 开始录音
  // 在状态管理中新增状态
  const [audioBlob, setAudioBlob] = useState(null);
  
  // 替换原有的语音识别初始化代码
  useEffect(() => {
  // 不再需要初始化浏览器语音识别
  }, []);
  
  // 修改开始录音函数
  // 将mediaRecorder实例存储在useRef中
  const mediaRecorderRef = useRef(null);
  
  const startRecording = async () => {
    try {
      console.log('正在获取麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('麦克风权限获取成功，开始录音');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder; // 存储实例
      const audioChunks = [];
    
      mediaRecorder.ondataavailable = (event) => {
        console.log('收到音频数据块');
        audioChunks.push(event.data);
      };
    
      mediaRecorder.onstop = async () => {
        console.log('录音停止，准备发送音频数据');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
  
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
  
        try {
          console.log('正在发送请求到ASR服务...');
          const response = await fetch('/asr?output=json', {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });
  
          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`ASR服务错误: ${response.status} - ${errorData}`);
          }
  
          const data = await response.json();
          console.log('ASR服务返回数据:', data);
          setUserAnswer(data.text);
        } catch (error) {
          console.error('ASR请求失败:', error);
          alert(`ASR服务请求失败: ${error.message}`);
        }
      };
  
      mediaRecorder.start();
      console.log('录音已开始');
      setIsRecording(true);
      setUserAnswer('');
    } catch (error) {
      console.error('录音启动失败:', error);
      alert('无法启动录音，请确保已授予麦克风权限。');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      console.log('正在停止录音...');
      mediaRecorderRef.current.stop(); // 调用stop方法
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // 停止所有音频轨道
    }
    setIsRecording(false);
  };

  // 提交答案并获取评分
  const submitAnswer = () => {
    // 这里将实现与LLM的交互来评估答案
    // 暂时使用模拟数据
    const mockFeedback = {
      contentScore: Math.floor(Math.random() * 5) + 6,
      fluencyScore: Math.floor(Math.random() * 5) + 6,
      grammarScore: Math.floor(Math.random() * 5) + 6,
      overallScore: Math.floor(Math.random() * 5) + 6,
      feedback: "Your answer was good, but could be improved by providing more specific examples and using more varied vocabulary."
    };
    
    setFeedback(mockFeedback);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>英语面试模拟器</h1>
        {!interviewStarted && (
          <button className="start-button" onClick={startInterview}>
            开始面试
          </button>
        )}
      </header>

      {interviewStarted && (
        <div className="interview-container">
          <div className="interviewer-section">
            <h2>面试官问题：</h2>
            <div className="question-box">{currentQuestion}</div>
          </div>

          <div className="user-section">
            <h2>你的回答：</h2>
            <div className="answer-box">
              {userAnswer || (isRecording ? "正在录音..." : "点击下方按钮开始回答")}
            </div>

            <div className="controls">
              {!isRecording ? (
                <button 
                  className="record-button" 
                  onClick={startRecording}
                  disabled={!!feedback}
                >
                  开始回答
                </button>
              ) : (
                <button className="stop-button" onClick={stopRecording}>
                  停止回答
                </button>
              )}

              <button 
                className="submit-button" 
                onClick={submitAnswer}
                disabled={!userAnswer || !!feedback}
              >
                提交答案
              </button>
            </div>
          </div>

          {feedback && (
            <div className="feedback-section">
              <h2>评分与反馈：</h2>
              <div className="scores">
                <div className="score-item">
                  <span>内容相关性：</span>
                  <span className="score">{feedback.contentScore}/10</span>
                </div>
                <div className="score-item">
                  <span>语言流畅度：</span>
                  <span className="score">{feedback.fluencyScore}/10</span>
                </div>
                <div className="score-item">
                  <span>语法准确性：</span>
                  <span className="score">{feedback.grammarScore}/10</span>
                </div>
                <div className="score-item overall">
                  <span>总体评分：</span>
                  <span className="score">{feedback.overallScore}/10</span>
                </div>
              </div>
              <div className="feedback-text">
                <h3>改进建议：</h3>
                <p>{feedback.feedback}</p>
              </div>
              <button className="next-button" onClick={nextQuestion}>
                下一个问题
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;