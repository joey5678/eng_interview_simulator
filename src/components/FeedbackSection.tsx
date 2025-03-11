import React from 'react';
import type { Feedback, FeedbackSectionProps } from '../types/index';

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedback, onNext }) => (
  <div className="feedback-section">
    <h2>评分反馈</h2>
    <div className="scores">
      <div className="score-item">
        <label>内容得分：</label>
        <span>{feedback.contentScore}</span>
      </div>
      <div className="score-item">
        <label>流畅度：</label>
        <span>{feedback.fluencyScore}</span>
      </div>
      <div className="score-item">
        <label>语法得分：</label>
        <span>{feedback.grammarScore}</span>
      </div>
      <div className="score-item">
        <label>总体得分：</label>
        <span>{feedback.overallScore}</span>
      </div>
    </div>
    
    {feedback.suggestions && (
      <div className="suggestions">
        <h3>改进建议：</h3>
        <p style={{ whiteSpace: 'pre-line' }}>{feedback.suggestions}</p>
      </div>
    )}

    <button onClick={onNext} className="next-button">
      下一题
    </button>
  </div>
);

export default React.memo(FeedbackSection);