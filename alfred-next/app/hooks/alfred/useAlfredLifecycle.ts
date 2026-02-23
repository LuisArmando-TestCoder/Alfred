import { useEffect } from 'react';

interface AlfredLifecycleProps {
  stopListening: () => void;
  soundOfCoincidenceRef: React.RefObject<HTMLAudioElement | null>;
  setIsReady: (isReady: boolean) => void;
}

export function useAlfredLifecycle({
  stopListening,
  soundOfCoincidenceRef,
  setIsReady,
}: AlfredLifecycleProps) {
  useEffect(() => {
    soundOfCoincidenceRef.current = new Audio('/mp3/coincidence.mp3');
    setIsReady(true);

    // Request Notification Permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    return () => {
      stopListening();
    };
  }, [stopListening, soundOfCoincidenceRef, setIsReady]);
}
