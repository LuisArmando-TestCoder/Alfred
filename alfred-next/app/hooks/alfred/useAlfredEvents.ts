import { useEffect } from 'react';
import { commands } from '../../services/commandService';

interface UseAlfredEventsProps {
  speak: (text: string, onEnd?: () => void) => void;
  checkRestartListening: () => void;
  setCurrentWord: (word: string) => void;
  soundOfCoincidenceRef: React.MutableRefObject<HTMLAudioElement | null>;
}

export function useAlfredEvents({
  speak,
  checkRestartListening,
  setCurrentWord,
  soundOfCoincidenceRef
}: UseAlfredEventsProps) {
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8000/api/events');

    eventSource.onopen = () => {
      console.log("EventSource connected to http://localhost:8000/api/events");
    };
    
    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { command, args } = data;
        
        console.log("Pulsed command received:", command, args);
        
        if (commands[command]) {
          setCurrentWord(command);
          if (soundOfCoincidenceRef.current) {
            soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
          }
          const resultMsg = await commands[command].action(...args);
          if (resultMsg) {
            console.log(`[alfred-next/app/hooks/alfred/useAlfredEvents.ts] Command result: ${resultMsg}`);
            
            // Send notification instead of speaking
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('Alfred', { body: resultMsg });
              } else {
                console.log("[alfred-next/app/hooks/alfred/useAlfredEvents.ts] Notification permission not granted.");
              }
            }
            
            // Check restart listening immediately since no speech is playing
            checkRestartListening();
          }
        }
      } catch (e) {
        console.error("Error parsing pulsed command:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed (browser will retry):", err);
    };

    return () => {
      eventSource.close();
    };
  }, [speak, checkRestartListening, setCurrentWord, soundOfCoincidenceRef]);
}
