'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ProcessingState = 'idle' | 'listening' | 'processing' | 'pondering' | 'speaking' | 'paused';

export default function AlfredInterface() {
  const [lastWordDisplay, setLastWordDisplay] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [availableCommands, setAvailableCommands] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const processingStateRef = useRef<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const soundOfCoincidenceRef = useRef<HTMLAudioElement | null>(null);
  
  const shouldListenRef = useRef(false);
  const isSystemActiveRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isConversationDoneRef = useRef(true);
  const isSpeechDoneRef = useRef(true);

  const updateProcessingState = (state: ProcessingState) => {
    setProcessingState(state);
    processingStateRef.current = state;
  };

  const fetchCommand = async (endpoint: string) => {
      try {
          const res = await fetch(`http://localhost:8000/${endpoint}`);
          if (!res.ok) throw new Error('Server error');
          const data = await res.json();
          
          if (data.action === 'open') {
              window.open(data.url, '_blank');
          } else if (data.action === 'open_multiple') {
              data.urls.forEach((url: string) => window.open(url, '_blank'));
          } else if (data.action === 'paint') {
              document.body.style.setProperty('background', data.color);
          }
          return data.message;
      } catch (err) {
          console.error("Fetch command failed", err);
          return "I could not reach the knowledge base.";
      }
  };

  const commands: Record<string, { action: () => Promise<any> }> = {
    'play nice music': { action: () => fetchCommand('music/nice') },
    'play powerful music': { action: () => fetchCommand('music/powerful') },
    'play funny music': { action: () => fetchCommand('music/funny') },
    'play sad music': { action: () => fetchCommand('music/sad') },
    'play awesome music': { action: () => fetchCommand('music/awesome') },
    'open frontend masters': { action: () => fetchCommand('link/study') },
    'open trello': { action: () => fetchCommand('link/board') },
    'open github': { action: () => fetchCommand('link/work') },
    'open storage': { action: () => fetchCommand('link/storage') },
    'open quickerjs': { action: () => fetchCommand('link/library') },
    'open space game': { action: () => fetchCommand('link/space') },
    'open p5 editor': { action: () => fetchCommand('link/editor') },
    'open dashboard': { action: () => fetchCommand('link/dashboard') },
    'open source code': { action: () => fetchCommand('link/body') },
    'open anime': { action: () => fetchCommand('link/anime') },
    'open netflix': { action: () => fetchCommand('link/entertainment') },
    'start new project': { action: () => fetchCommand('link/project') },
    'open regex101': { action: () => fetchCommand('link/regular') },
    'open challenges': { action: () => fetchCommand('link/challenge') },
    'paint blue': { action: () => fetchCommand('paint/blue') },
    'paint yellow': { action: () => fetchCommand('paint/yellow') },
    'paint pink': { action: () => fetchCommand('paint/pink') },
    'paint black': { action: () => fetchCommand('paint/black') },
  };

  const startListening = () => {
    shouldListenRef.current = true;
    updateProcessingState('listening');
    setStatusMessage("Listening...");
    transcriptBufferRef.current = '';
    accumulatedTranscriptRef.current = '';
    if (recognitionRef.current && !isRecognitionRunningRef.current) {
        try { recognitionRef.current.start(); } catch(e) {}
    }
  };

  const checkRestartListening = () => {
    if (isConversationDoneRef.current && isSpeechDoneRef.current) {
      if (isSystemActiveRef.current) {
        startListening();
      } else {
        updateProcessingState('paused');
      }
    }
  };

  const speakChunk = (text: string, isFinal: boolean = false) => {
    if (!isSystemActiveRef.current) return;
    if ('speechSynthesis' in window) {
      if (!text && !isFinal) return;
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

      if (isFinal) {
        isSpeechDoneRef.current = false;
        utterance.onend = () => {
          if (!window.speechSynthesis.pending) {
            isSpeechDoneRef.current = true;
            checkRestartListening();
          }
        };
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  const speak = (text: string) => {
    if (!isSystemActiveRef.current) return;
    if ('speechSynthesis' in window) {
      updateProcessingState('speaking');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
        checkRestartListening();
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const runContextManager = async (prompt: string, currentContext: string) => {
    try {
      const crudPrompt = `
          You are a Context Manager. 
          Your job is to update the Context file based on the new interaction.
          The context file saves information in verboseProperty:conciseValue pairs.
          
          Current Context Content:
          """
          ${currentContext}
          """
          
          User just said: "${prompt}"
          
          Instructions:
          1. Return the ENTIRE updated content of the context.
          2. Use ONLY verboseProperty:conciseValue pairs.
          3. Use camelCase for properties. NO spaces in properties or values.
          4. Use colons (:) to separate property and value.
          5. MANDATORY: Use a NEW LINE to separate each property-value pair.
          6. Do NOT delete existing information unless it is explicitly contradicted or the user asks to forget it.
          7. Output ONLY the plain text content. 
          8. NEVER use markdown blocks (no \`\`\`), no headers, no explanations.
          
          Example Output:
          userName:PaulRyan
          userMood:happy
          lastAction:requestMusic
          `;

      const res = await fetch('http://192.168.100.35:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "phi3",
          prompt: crudPrompt,
          stream: false,
          options: { temperature: 0 }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const newContext = json.response.trim();

        // Save new context to server
        await fetch('http://localhost:8000/api/context/raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContext })
        });

        return newContext;
      }
      return currentContext;
    } catch (e) {
      console.error("Context Manager failed", e);
      return currentContext;
    }
  };

  const runPonderingAgent = async (prompt: string) => {
    try {
      const res = await fetch('http://192.168.100.35:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "phi3",
          prompt: `Determine if the following message requires deep philosophical thought, complex reasoning, or emotional reflection. 
          Message: "${prompt}"
          Answer ONLY "YES" or "NO".`,
          stream: false,
          options: { temperature: 0 }
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.response.trim().toUpperCase().includes('YES');
      }
    } catch (e) {
      console.error("Pondering agent failed", e);
    }
    return false;
  };

  const runConversationAgent = async (prompt: string, mdContext: string) => {
    updateProcessingState('processing');
    isConversationDoneRef.current = false;

    const needsPondering = await runPonderingAgent(prompt);
    if (needsPondering) {
      updateProcessingState('pondering');
      await new Promise(resolve => setTimeout(resolve, 2500));
    }

    try {
      const fullPrompt = `
        <|system|>
        Persona: Minimal formal British butler. Address as Sir.
        Constraint 1: ONLY output natural language.
        Constraint 2: NEVER output context properties, markdown, or instructions.
        Constraint 3: Be extremely concise and compact. One short sentence maximum if possible.
        Context:
        ${mdContext}
        <|user|>
        ${prompt}
        <|assistant|>
        `;

      const res = await fetch('http://192.168.100.35:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "phi3",
          prompt: fullPrompt,
          stream: true,
          options: { temperature: 0.1, stop: ["<|end|>", "<|user|>", "###"] }
        })
      });

      if (!res.ok) throw new Error("Ollama connection failed");
      if (!res.body) throw new Error("No response body");

      updateProcessingState('speaking');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';
      let sentenceBuffer = '';
      let lineBuffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.response) {
                const word = json.response;
                fullResponse += word;
                sentenceBuffer += word;
                setLastWordDisplay(fullResponse);

                let match = sentenceBuffer.match(/([.!?\n]+)/);
                if (match) {
                  const index = match.index! + match[0].length;
                  const toSpeak = sentenceBuffer.substring(0, index);
                  const remainder = sentenceBuffer.substring(index);
                  speakChunk(toSpeak, false);
                  sentenceBuffer = remainder;
                }
              }
              if (json.done) {
                speakChunk(sentenceBuffer, true);
                isConversationDoneRef.current = true;
                checkRestartListening();
              }
            } catch (e) {
              console.error("JSON Parse error", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Agent flow failed:", err);
      speak("I could not reach the brain.");
      isConversationDoneRef.current = true;
      checkRestartListening();
    }
  };

  const runCommandAgent = async (prompt: string, context: string) => {
    try {
      const commandList = Object.keys(commands);
      const cmdPrompt = `
        You are a command parser.
        Context:
        ${context}
        User said: "${prompt}"
        Available commands:
        ${commandList.join('\n')}
        
        Instructions:
        1. Decide which command to trigger from the list.
        2. If the user message does NOT explicitly ask for one of the available commands, you MUST output ONLY dots: .......
        3. A command is only explicitly asked for if the user uses a clear verb at the beginning (e.g., "Play...", "Open...", "Paint...").
        4. Do NOT explain your choice. Do NOT talk.
        5. If a command matches, return its exact name from the list.
        6. If NO command is requested, output ONLY dots: .......
        `;

      const res = await fetch('http://192.168.100.35:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "phi3",
          prompt: cmdPrompt,
          stream: false,
          options: { temperature: 0 }
        })
      });

      if (!res.ok) return;
      const json = await res.json();
      const response = json.response.trim();
      
      if (response.includes('..')) {
        return;
      }

      const matchedKey = commandList.find(key => response.includes(key));
      if (matchedKey) {
        setCurrentWord(matchedKey);
        if (soundOfCoincidenceRef.current) {
          soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
        }
        const command = commands[matchedKey];
        const msg = await command.action();
        // if (msg) speak(msg);
      }
    } catch (err) {
      console.error("Command Agent failed", err);
    }
  };

  const handleSilenceDetected = async () => {
    const fullText = (accumulatedTranscriptRef.current + transcriptBufferRef.current).trim();
    if (!fullText) return;

    shouldListenRef.current = false;
    if (recognitionRef.current) recognitionRef.current.stop();
    updateProcessingState('processing');
    setStatusMessage("Processing...");

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 0. Fetch Current Context once
    const contextRes = await fetch('http://localhost:8000/api/context/raw');
    const contextData = await contextRes.json();
    const currentContext = contextData.content;

    // Simultaneous Execution of 3 agents
    isConversationDoneRef.current = false;
    isSpeechDoneRef.current = true; // Initial state for this cycle

    runCommandAgent(fullText, currentContext);
    runContextManager(fullText, currentContext);
    runConversationAgent(fullText, currentContext);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Browser does not support Speech Recognition");
      return;
    }
    soundOfCoincidenceRef.current = new Audio('/mp3/coincidence.mp3');
    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
        isRecognitionRunningRef.current = true;
        updateProcessingState('listening');
        setStatusMessage("Listening...");
    };
    recognition.onresult = (event: any) => {
        let t = '';
        for (let i = 0; i < event.results.length; ++i) {
            t += event.results[i][0].transcript;
        }
        transcriptBufferRef.current = t;
        setLastWordDisplay(accumulatedTranscriptRef.current + t);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
             handleSilenceDetected();
        }, 2000);
    };
    recognition.onerror = (e: any) => {
        if (e.error === 'no-speech') return;
        if (e.error === 'network') {
            try { recognition.stop(); } catch(e) {}
        } else {
             if (e.error !== 'aborted') {
                 updateProcessingState('idle');
                 shouldListenRef.current = false;
             }
        }
    };
    recognition.onend = () => {
        isRecognitionRunningRef.current = false;
        // If it was supposed to be listening, restart it
        if (shouldListenRef.current && processingStateRef.current === 'listening') {
             accumulatedTranscriptRef.current += transcriptBufferRef.current + ' ';
             transcriptBufferRef.current = '';
             try { recognition.start(); } catch(e) {}
        }
    };
    recognitionRef.current = recognition;
    if ('speechSynthesis' in window) {
         window.speechSynthesis.onvoiceschanged = () => {
             voicesRef.current = window.speechSynthesis.getVoices();
         };
         voicesRef.current = window.speechSynthesis.getVoices();
    }
    setAvailableCommands(Object.keys(commands));
    setIsReady(true);

    const watchdog = setInterval(() => {
      if (shouldListenRef.current && 
          processingStateRef.current === 'listening' && 
          !isRecognitionRunningRef.current) {
        console.log("Watchdog: Restarting recognition...");
        try { recognition.start(); } catch(e) {}
      }
    }, 5000);

    return () => {
        clearInterval(watchdog);
        shouldListenRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch(e) {}
        }
    };
  }, []);

  const handleStartManual = () => {
      shouldListenRef.current = true;
      isSystemActiveRef.current = true;
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => startListening())
        .catch(() => setStatusMessage("Permission Denied"));
  };

  const toggleListening = () => {
    if (isSystemActiveRef.current) {
      isSystemActiveRef.current = false;
      shouldListenRef.current = false;
      updateProcessingState('paused');
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
    } else {
      isSystemActiveRef.current = true;
      startListening();
    }
  };

  const getStateColor = () => {
      switch(processingState) {
          case 'listening': return 'text-green-500';
          case 'processing': return 'text-blue-500';
          case 'pondering': return 'text-orange-500';
          case 'speaking': return 'text-purple-500';
          case 'paused': return 'text-yellow-500';
          default: return 'text-gray-500';
      }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen font-sans text-center">
      {!isReady && <div className="text-xl text-green-500">Loading Alfred System...</div>}
      {isReady && processingState === 'idle' && (
          <div className="flex flex-col items-center">
              <button onClick={handleStartManual} className="px-6 py-3 text-2xl font-bold text-green-500 border-2 border-green-500 rounded hover:bg-green-500 hover:text-black transition">
                Click to Activate
              </button>
              {statusMessage && <div className="mt-4 text-red-500 bg-black/80 px-4 py-2 rounded border border-red-900">{statusMessage}</div>}
          </div>
      )}
      {processingState !== 'idle' && (
          <div className="flex flex-col items-center gap-8">
              <div className={`text-xl font-bold border px-4 py-2 rounded bg-black/80 ${getStateColor()} border-current`}>
                  State: {processingState.toUpperCase()}
              </div>
              {statusMessage && <span className="text-lg text-yellow-400 mb-2 border border-yellow-900 px-2 py-1 rounded bg-black/50">{statusMessage}</span>}
              <span className="text-2xl text-green-400 opacity-80 max-w-3xl px-4">{lastWordDisplay}</span>
              <h1 className="text-6xl font-bold text-green-500 tracking-widest uppercase glow">{currentWord}</h1>
              <ul className="flex flex-wrap justify-center gap-4 max-w-4xl max-h-60 overflow-y-auto px-4">
                  {availableCommands.map((item) => (
                      <li key={item} className="text-sm text-green-700 bg-black/50 px-2 py-1 border border-green-900 rounded hover:text-green-500 hover:border-green-500 transition-colors">
                          {item}
                      </li>
                  ))}
              </ul>
              <button onClick={toggleListening} className="mt-4 px-6 py-2 font-bold text-yellow-500 border border-yellow-500 rounded hover:bg-yellow-500 hover:text-black transition-colors">
                {processingState === 'paused' ? 'RESUME' : 'PAUSE'}
              </button>
              <button onClick={() => { shouldListenRef.current = false; if (recognitionRef.current) recognitionRef.current.abort(); window.location.reload(); }} className="mt-8 px-4 py-2 text-sm text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white">
                Reset System
              </button>
          </div>
      )}
      <style jsx global>{`
        .glow { text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41; }
      `}</style>
    </div>
  );
}
