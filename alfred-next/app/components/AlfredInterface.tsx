'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ProcessingState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function AlfredInterface() {
  const [lastWordDisplay, setLastWordDisplay] = useState('Click first');
  const [currentWord, setCurrentWord] = useState('Click first');
  const [treeItems, setTreeItems] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const commandLevelRef = useRef<any>(null);
  const rootCommandRef = useRef<any>(null);
  const soundOfCoincidenceRef = useRef<HTMLAudioElement | null>(null);
  
  const shouldListenRef = useRef(false);
  const retryCountRef = useRef(0);
  const isNetworkErrorRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef('');
  
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);

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

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      setProcessingState('speaking');
      
      // Stop listening if happening
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
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
      
      utterance.onend = () => {
          // Resume listening after speaking
          startListening();
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const askOllama = async (prompt: string, actionResult: string | null, availableCommands: string[]) => {
    setProcessingState('processing');
    try {
        const systemContext = `Context:\n- Action Taken: ${actionResult || 'None'}\n- Commands: ${availableCommands.join(', ')}`;
        const fullPrompt = `User said: "${prompt}"\n${systemContext}\nRespond naturally as Alfred.`;

        // TALK DIRECTLY TO WINDOWS - Bypasses macOS Deno Sandbox
        const res = await fetch('http://192.168.100.35:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "phi3", // "llama3.1:8b",
                prompt: fullPrompt,
                stream: false
            })
        });

        if (!res.ok) throw new Error("Ollama connection failed");

        const data = await res.json();
        if (data?.response) {
            speak(data.response);
            setLastWordDisplay(data.response);
        } else {
            speak("I have nothing to say.");
        }
    } catch (err) {
        console.error("Browser direct call failed:", err);
        speak("I could not reach the brain directly.");
    }
  };

  const createCommands = () => ({
    Alfred: {
        nice: () => fetchCommand('music/nice'),
        powerful: () => fetchCommand('music/powerful'),
        funny: () => fetchCommand('music/funny'),
        sad: () => fetchCommand('music/sad'),
        awesome: () => fetchCommand('music/awesome'),
        want: {    
            talk: () => fetchCommand('link/talk'),
            study: () => fetchCommand('link/study'),
            message: () => fetchCommand('link/message'),
            look: {
                board: () => fetchCommand('link/board'),
                work: () => fetchCommand('link/work'),
                storage: () => fetchCommand('link/storage'),
                library: () => fetchCommand('link/library'),
                space: () => fetchCommand('link/space'),
                editor: () => fetchCommand('link/editor'),
                dashboard: () => fetchCommand('link/dashboard'),
                body: () => fetchCommand('link/body'),
                anime: () => fetchCommand('link/anime')
            },
            have: {
                fun: () => fetchCommand('link/fun'),
                entertainment: () => fetchCommand('link/entertainment'),
            },
            make: {
                project: () => fetchCommand('link/project'),
                experiment: () => fetchCommand('link/experiment'),
                regular: () => fetchCommand('link/regular'),
                challenge: () => fetchCommand('link/challenge')
            }
        },
        life: () => fetchCommand('info/life'),
        remember: {
            name: () => Promise.resolve("Remembered Name")
        },
        paint: {
            blue: () => fetchCommand('paint/blue'),
            yellow: () => fetchCommand('paint/yellow'),
            pink: () => fetchCommand('paint/pink'),
            black: () => fetchCommand('paint/black')
        },
        what: {
            definition: () => fetchCommand('info/definition'),
            your: {
                name: () => fetchCommand('info/identity')
            },
            my: {
                name: () => {
                     const person = localStorage.getItem('currentPerson') || 'friend';
                     return Promise.resolve(`Your name is ${person}`);
                }
            }
        },
        who: {
            creator: () => fetchCommand('info/creator'),
            you: () => fetchCommand('info/identity')
        }
    }
  });

  const showTreeInDom = (level: any) => {
      const items: string[] = [];
      for (const key in level) {
          items.push(key);
      }
      setTreeItems(items);
  };

  const processCommand = async (text: string) => {
      // Normalize: lowercase, strip punctuation, split into words
      const words = text.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 0);

      let currentLevel = commandLevelRef.current || rootCommandRef.current;
      let executionMessages: string[] = [];
      let pathChanged = false;

      // Helper for case-insensitive key lookup
      const findKey = (obj: any, searchKey: string) => 
          Object.keys(obj).find(k => k.toLowerCase() === searchKey);

      for (const word of words) {
          if (word === 'delete') {
              commandLevelRef.current = rootCommandRef.current;
              showTreeInDom(rootCommandRef.current);
              setCurrentWord('Reset');
              return "Command Deleted/Reset";
          }

          // 1. Try to find in current level
          let actualKey = findKey(currentLevel, word);
          let next = actualKey ? currentLevel[actualKey] : undefined;

          // 2. If not found, try root (allow context switching)
          if (!next && currentLevel !== rootCommandRef.current) {
              const rootKey = findKey(rootCommandRef.current, word);
              if (rootKey) {
                  currentLevel = rootCommandRef.current;
                  actualKey = rootKey;
                  next = currentLevel[actualKey];
                  pathChanged = true;
              }
          }

          if (next) {
              setCurrentWord(actualKey!); 
              if (soundOfCoincidenceRef.current) {
                  soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
              }

              if (typeof next === 'function') {
                  // Execute command
                  const msg = await next();
                  executionMessages.push(msg);
                  // Note: We stay at currentLevel to allow sibling commands (e.g. "blue yellow")
              } else {
                  // Traverse deeper
                  currentLevel = next;
                  showTreeInDom(next);
                  pathChanged = true;
              }
          }
      }

      commandLevelRef.current = currentLevel;

      if (executionMessages.length > 0) {
          return executionMessages.join(". ");
      }
      
      return pathChanged ? "Navigated command tree" : null;
  };

  const startListening = () => {
      shouldListenRef.current = true;
      setProcessingState('listening');
      setStatusMessage("Listening...");
      transcriptBufferRef.current = '';
      
      if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {
              // Ignore if already started
          }
      }
  };

  const handleSilenceDetected = async () => {
      const text = transcriptBufferRef.current.trim();
      if (!text) {
          // No speech, just restart listening loop handled by onend?
          // If silence detected but buffer empty, maybe user just stopped talking?
          return; 
      }
      
      console.log("Silence detected. Processing:", text);
      
      // Stop listening to process
      shouldListenRef.current = false; // Prevent auto-restart by onend immediate loop
      if (recognitionRef.current) recognitionRef.current.stop();
      
      setProcessingState('processing');
      setStatusMessage("Processing...");

      // Process full transcript for VCLI
      const vcliAction = await processCommand(text);
      
      const available = Object.keys(commandLevelRef.current || {});
      await askOllama(text, vcliAction, available);
      
      // askOllama calls speak, which calls startListening on end
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatusMessage("Browser does not support Speech Recognition");
      return;
    }

    soundOfCoincidenceRef.current = new Audio('/mp3/coincidence.mp3');
    const alfredObj = createCommands();
    rootCommandRef.current = alfredObj;
    commandLevelRef.current = alfredObj;
    showTreeInDom(alfredObj);

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log("Speech Recognition Started");
        setProcessingState('listening');
        setStatusMessage("Listening...");
    };

    recognition.onresult = (event: any) => {
        retryCountRef.current = 0;
        
        let interim = '';
        let final = '';

        // Build transcript from results
        for (let i = event.resultIndex; i < event.results.length; ++i) {
             if (event.results[i].isFinal) {
                 final += event.results[i][0].transcript;
             } else {
                 interim += event.results[i][0].transcript;
             }
        }
        
        const fullTranscript = (transcriptBufferRef.current + ' ' + final + interim).trim();
        // Actually, continuous mode appends to results list. 
        // We should just read the latest results.
        // A better way for continuous:
        let t = '';
        for (let i = 0; i < event.results.length; ++i) {
            t += event.results[i][0].transcript;
        }
        
        transcriptBufferRef.current = t;
        setLastWordDisplay(t);
        setProcessingState('listening');
        
        // Reset silence timer (debounce 2s)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
             handleSilenceDetected();
        }, 2000);
    };

    recognition.onerror = (e: any) => {
        if (e.error === 'no-speech') return;

        console.error("Speech Recognition Error:", e.error || e);
        
        if (e.error === 'network') {
            // Simple network handling
            setStatusMessage("Network Error. Retrying...");
            isNetworkErrorRef.current = true;
            try { recognition.stop(); } catch(e) {}
        } else {
             setStatusMessage("Error: " + (e.error || "Unknown"));
             if (e.error !== 'aborted') {
                 setProcessingState('idle');
                 shouldListenRef.current = false;
             }
        }
    };

    recognition.onend = () => {
        console.log("Speech Recognition Ended");
        
        // If we are supposed to be listening and not processing/speaking
        if (shouldListenRef.current && processingState === 'listening') {
             // Restart
             try { recognition.start(); } catch(e) {}
        } else {
             // Maybe we stopped to speak or process
        }
    };

    recognitionRef.current = recognition;
    
    if ('speechSynthesis' in window) {
         window.speechSynthesis.onvoiceschanged = () => {
             voicesRef.current = window.speechSynthesis.getVoices();
         };
         voicesRef.current = window.speechSynthesis.getVoices();
    }

    setIsReady(true);

    return () => {
        shouldListenRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch(e) {}
        }
    };
  }, []);

  const handleStartManual = () => {
      shouldListenRef.current = true;
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            startListening();
        })
        .catch((err) => {
            console.error("Microphone permission denied:", err);
            setStatusMessage("Permission Denied");
        });
  };

  const getStateColor = () => {
      switch(processingState) {
          case 'listening': return 'text-green-500';
          case 'processing': return 'text-blue-500';
          case 'speaking': return 'text-purple-500';
          default: return 'text-gray-500';
      }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen font-sans text-center">
      {!isReady && <div className="text-xl text-green-500">Loading Alfred System...</div>}
      
      {isReady && processingState === 'idle' && (
          <div className="flex flex-col items-center">
              <button 
                onClick={handleStartManual}
                className="px-6 py-3 text-2xl font-bold text-green-500 border-2 border-green-500 rounded hover:bg-green-500 hover:text-black transition"
              >
                Click to Activate
              </button>
              {statusMessage && <div className="mt-4 text-red-500 bg-black/80 px-4 py-2 rounded border border-red-900">{statusMessage}</div>}
          </div>
      )}

      {diagnostics && (
          <div className="fixed top-4 right-4 bg-black/90 border border-red-500 p-4 text-left font-mono text-sm z-50 rounded">
              <h3 className="text-red-500 font-bold mb-2">Diagnostics</h3>
              {/* Diag content */}
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
              
              <ul className="flex flex-wrap justify-center gap-4 max-w-2xl">
                  {treeItems.map((item) => (
                      <li key={item} className="text-xl text-green-700 bg-black/50 px-3 py-1 border border-green-900 rounded">
                          {item}
                      </li>
                  ))}
              </ul>
              
              <button 
                onClick={() => {
                    shouldListenRef.current = false;
                    if (recognitionRef.current) recognitionRef.current.abort();
                    window.location.reload();
                }} 
                className="mt-8 px-4 py-2 text-sm text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white"
              >
                Reset System
              </button>
          </div>
      )}
      
      <style jsx global>{`
        .glow {
            text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41;
        }
      `}</style>
    </div>
  );
}
