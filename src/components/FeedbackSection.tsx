import React from 'react';
import type { Feedback, FeedbackSectionProps } from '../types/index';

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedback, onNext }) => (
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
    <button className="next-button" onClick={onNext}>
      下一个问题
    </button>
  </div>
);

export default React.memo(FeedbackSection);