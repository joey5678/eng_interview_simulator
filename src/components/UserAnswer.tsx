import React from 'react';
import { UserAnswerProps } from '../types/index';
import './UserAnswer.css';

const UserAnswer: React.FC<UserAnswerProps> = ({
  userAnswer,
  translatedText,
  isRecording,
  isLoading,
  feedback,
  onStartRecording,
  onStopRecording,
  onTranslate,
  onSubmit
}) => (
  <div className="user-section">
    <h2>你的回答</h2>
    <div className="answer-container">
      <div className="answer-box">
        <h3>英文回答</h3>
        <p>{userAnswer || (isRecording ? "正在录音..." : "点击下方按钮开始回答")}</p>
      </div>
      <div className="answer-box">
        <h3>中文翻译</h3>
        <p style={{ whiteSpace: 'pre-line' }}>
          {translatedText || "等待翻译..."}
        </p>
      </div>
    </div>

    <div className="controls">
      {isLoading ? (
        <div className="loading">处理中</div>
      ) : (
        <>
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isLoading}
          >
            {isRecording ? '停止回答' : userAnswer.trim() ? '继续回答' : '开始回答'}
          </button>

          <button 
            className="submit-button" 
            onClick={onSubmit}
            disabled={!userAnswer || !!feedback}
          >
            提交答案
          </button>
        </>
      )}
    </div>
  </div>
);

export default React.memo(UserAnswer);