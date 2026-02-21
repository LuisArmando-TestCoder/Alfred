import { useRef, useEffect, useCallback } from 'react';
import { ProcessingState } from '../types/alfred';

interface UseAlfredSpeechProps {
  onStatusChange: (message: string) => void;
  onProcessingStateChange: (state: ProcessingState) => void;
  onResult: (transcript: string, accumulated: string) => void;
  onSilenceDetected: () => void;
  shouldListenRef: React.MutableRefObject<boolean>;
  processingStateRef: React.MutableRefObject<ProcessingState>;
}

export function useAlfredSpeech({
  onStatusChange,
  onProcessingStateChange,
  onResult,
  onSilenceDetected,
  shouldListenRef,
  processingStateRef
}: UseAlfredSpeechProps) {
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isSpeechDoneRef = useRef(true);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    onProcessingStateChange('listening');
    onStatusChange("Listening...");
    transcriptBufferRef.current = '';
    accumulatedTranscriptRef.current = '';
    if (recognitionRef.current && !isRecognitionRunningRef.current) {
      try { recognitionRef.current.start(); } catch (e) { }
    }
  }, [onProcessingStateChange, onStatusChange, shouldListenRef]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [shouldListenRef]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    onProcessingStateChange('speaking');
    stopListening();

    const utterance = new SpeechSynthesisUtterance(text);
    let voices = voicesRef.current;
    if (voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
      voicesRef.current = voices;
    }
    const voice = voices.find(v => v.name === 'Google UK English Male') || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.pitch = 0.8;
    isSpeechDoneRef.current = false;
    utterance.onend = () => {
      isSpeechDoneRef.current = true;
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }, [onProcessingStateChange, stopListening]);

  const speakChunk = useCallback((text: string, isFinal: boolean = false, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!text && !isFinal) return;

    isSpeechDoneRef.current = false;

    const textToSpeak = text || " ";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    let voices = voicesRef.current;
    if (voices.length === 0) {
      voices = window.speechSynthesis.getVoices();
      voicesRef.current = voices;
    }
    const voice = voices.find(v => v.name === 'Google UK English Male') || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.pitch = 0.8;

    utterance.onend = () => {
      // Check if this was the last utterance in the queue
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        isSpeechDoneRef.current = true;
        if (onEnd) onEnd();
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onStatusChange("Browser does not support Speech Recognition");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognitionRunningRef.current = true;
      onProcessingStateChange('listening');
      onStatusChange("Listening...");
    };

    recognition.onresult = (event: any) => {
      let t = '';
      for (let i = 0; i < event.results.length; ++i) {
        t += event.results[i][0].transcript;
      }
      transcriptBufferRef.current = t;
      onResult(t, accumulatedTranscriptRef.current);
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        onSilenceDetected();
      }, 2000);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'network') {
        try { recognition.stop(); } catch (err) { }
      } else {
        if (e.error !== 'aborted') {
          onProcessingStateChange('idle');
          shouldListenRef.current = false;
        }
      }
    };

    recognition.onend = () => {
      isRecognitionRunningRef.current = false;
      if (shouldListenRef.current && processingStateRef.current === 'listening') {
        accumulatedTranscriptRef.current += transcriptBufferRef.current + ' ';
        transcriptBufferRef.current = '';
        try { recognition.start(); } catch (err) { }
      }
    };

    recognitionRef.current = recognition;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      voicesRef.current = window.speechSynthesis.getVoices();
    }

    const watchdog = setInterval(() => {
      if (shouldListenRef.current &&
        processingStateRef.current === 'listening' &&
        !isRecognitionRunningRef.current) {
        console.log("Watchdog: Restarting recognition...");
        try { recognition.start(); } catch (err) { }
      }
    }, 5000);

    return () => {
      clearInterval(watchdog);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (err) { }
      }
    };
  }, [onStatusChange, onProcessingStateChange, onResult, onSilenceDetected, shouldListenRef, processingStateRef]);

  return {
    startListening,
    stopListening,
    speak,
    speakChunk,
    cancelSpeech,
    isSpeechDoneRef,
    transcriptBufferRef,
    accumulatedTranscriptRef
  };
}
