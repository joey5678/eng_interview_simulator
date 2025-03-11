import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import InterviewQuestion from './InterviewQuestion';

describe('InterviewQuestion', () => {
  it('renders the question correctly', () => {
    const testQuestion = 'Tell me about yourself.';
    render(<InterviewQuestion question={testQuestion} />);
    
    expect(screen.getByText('面试官问题：')).toBeInTheDocument();
    expect(screen.getByText(testQuestion)).toBeInTheDocument();
  });
});