import React from 'react';
import { UserAnswerProps } from '../types/index';

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
    <h2>你的回答：</h2>
    <div className="answer-container">
      <div className="answer-box">
        <h3>英文回答：</h3>
        <p>{userAnswer || (isRecording ? "正在录音..." : "点击下方按钮开始回答")}</p>
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
          {!isRecording ? (
            <button
            className='record-button'
            onClick={onStartRecording}
            disabled={isLoading}
            >
            {userAnswer.trim() ? '继续回答' : '开始回答'}
            </button>
          ) : (
            <>
              <button className="stop-button" onClick={onStopRecording}>
                暂停回答
              </button>
            </>
          )}

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