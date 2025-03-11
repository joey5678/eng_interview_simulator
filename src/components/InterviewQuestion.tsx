import React from 'react';

interface InterviewQuestionProps {
  question: string;
}

const InterviewQuestion: React.FC<InterviewQuestionProps> = ({ question }) => (
  <div className="interviewer-section">
    <h2>面试官问题：</h2>
    <div className="question-box">{question}</div>
  </div>
);

export default React.memo(InterviewQuestion);