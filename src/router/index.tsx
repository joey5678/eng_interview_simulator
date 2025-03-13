import { createBrowserRouter } from 'react-router-dom';
import InterviewApp from '../components/InterviewSimulator/InterviewSimulator';
import SpeakingPractice from '../components/SpeakingPractice/SpeakingPractice';
import MainLayout from '../components/Layout/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <InterviewApp />
      },
      {
        path: '/speaking-practice',
        element: <SpeakingPractice />
      }
    ]
  }
]);