import { useState, useRef, useCallback } from 'react';
import { AudioState } from '../types/index';

export const useAudioRecorder = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isPaused: false,
    audioBlob: null
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      console.log('正在获取麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('麦克风权限获取成功，开始录音');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
    
      mediaRecorder.ondataavailable = (event) => {
        console.log('收到音频数据块');
        audioChunksRef.current.push(event.data);
      };
    
      mediaRecorder.start();
      setAudioState(prev => ({ ...prev, isRecording: true, isPaused: false }));
      
    } catch (error) {
      console.error('录音启动失败:', error);
      throw new Error('无法启动录音，请确保已授予麦克风权限。');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && audioState.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setAudioState(prev => ({ 
        ...prev, 
        isRecording: false, 
        isPaused: false,
        audioBlob 
      }));
      
      return audioBlob;
    }
  }, [audioState.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && audioState.isRecording) {
      mediaRecorderRef.current.pause();
      setAudioState(prev => ({ ...prev, isPaused: true }));
    }
  }, [audioState.isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && audioState.isPaused) {
      mediaRecorderRef.current.resume();
      setAudioState(prev => ({ ...prev, isPaused: false }));
    }
  }, [audioState.isPaused]);

  return {
    audioState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  };
};