import { useState, useEffect } from 'react';
import { useAlfredStore } from '../../store/useAlfredStore';
import { getBackendUrl } from '../../services/agents/utils';

export function useAlfredKnowledge() {
  const { setContextText } = useAlfredStore();
  const [readmeText, setReadmeText] = useState('');

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/context/raw`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setContextText(data.content);
      } catch (err) {
        console.error("Failed to fetch context", err);
      }
    };

    const fetchReadme = async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/api/readme`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setReadmeText(data.content);
      } catch (err) {
        console.error("Failed to fetch readme", err);
      }
    };

    fetchContext();
    fetchReadme();
  }, [setContextText]);

  return { readmeText };
}
