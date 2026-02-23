import { useEffect } from 'react';
import { useAlfredStore } from '../../store/useAlfredStore';
import { getBackendUrl } from '../../services/agents/utils';
import { commands } from '../../services/commandService';
import { AgentState } from '../../types/alfred';

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
  const { setContextText } = useAlfredStore();

  useEffect(() => {
    console.log(`[useAlfredEvents] Connecting to SSE at ${getBackendUrl()}/api/events`);
    const eventSource = new EventSource(`${getBackendUrl()}/api/events`);

    eventSource.onopen = () => {
      console.log(`[useAlfredEvents] EventSource connected to ${getBackendUrl()}/api/events`);
    };

    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[useAlfredEvents] SSE Message received:", data);
        
        // Handle context updates
        if (data.type === 'context_update') {
          setContextText(data.content);
        } 
        // Handle pulsed commands (from cron or server)
        else if (data.command && commands[data.command]) {
          const { command, args = [] } = data;
          console.log(`[useAlfredEvents] Executing pulsed command: ${command}(${args.join(', ')})`);
          
          setCurrentWord(command);
          if (soundOfCoincidenceRef.current) {
            soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
          }
          
          speak(`Executing server command. ${command.replace(/_/g, ' ')}.`);
          const resultMsg = await commands[command].action(...args);
          if (resultMsg) {
            speak(resultMsg);
          }
        }
      } catch (err) {
        console.error("[useAlfredEvents] Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[useAlfredEvents] EventSource failed", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [setContextText, speak, checkRestartListening, setCurrentWord, soundOfCoincidenceRef]);
}
