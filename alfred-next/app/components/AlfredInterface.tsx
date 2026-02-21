'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type ProcessingState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused';

export default function AlfredInterface() {
  const [lastWordDisplay, setLastWordDisplay] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [availableCommands, setAvailableCommands] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const soundOfCoincidenceRef = useRef<HTMLAudioElement | null>(null);
  
  const shouldListenRef = useRef(false);
  const isSystemActiveRef = useRef(false);
  const retryCountRef = useRef(0);
  const isNetworkErrorRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  
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

  const commands: Record<string, { action: () => Promise<any> }> = {
    'play nice music': { action: () => fetchCommand('music/nice') },
    'play powerful music': { action: () => fetchCommand('music/powerful') },
    'play funny music': { action: () => fetchCommand('music/funny') },
    'play sad music': { action: () => fetchCommand('music/sad') },
    'play awesome music': { action: () => fetchCommand('music/awesome') },
    'open slack': { action: () => fetchCommand('link/talk') },
    'open frontend masters': { action: () => fetchCommand('link/study') },
    'open whatsapp': { action: () => fetchCommand('link/message') },
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
    'life definition': { action: () => fetchCommand('info/life') },
    'define word': { action: () => fetchCommand('info/definition') },
    'who are you': { action: () => fetchCommand('info/identity') },
    'who is your creator': { action: () => fetchCommand('info/creator') },
    'paint blue': { action: () => fetchCommand('paint/blue') },
    'paint yellow': { action: () => fetchCommand('paint/yellow') },
    'paint pink': { action: () => fetchCommand('paint/pink') },
    'paint black': { action: () => fetchCommand('paint/black') },
    'remember name': { action: () => Promise.resolve("Remembered Name") },
    'what is my name': { action: () => {
         const person = localStorage.getItem('currentPerson') || 'friend';
         return Promise.resolve(`Your name is ${person}`);
    } }
  };

  const speak = (text: string) => {
    if (!isSystemActiveRef.current) return;

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
          if (isSystemActiveRef.current) {
              startListening();
          } else {
              setProcessingState('paused');
          }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakChunk = (text: string, isFinal: boolean = false) => {
      if (!isSystemActiveRef.current) return;

      if ('speechSynthesis' in window) {
          // If text is empty and not final, do nothing
          if (!text && !isFinal) return;
          
          // If text is empty but final, use a space to trigger onend
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
              utterance.onend = () => {
                  // Only restart listening if we are done with all chunks (queue empty)
                  if (!window.speechSynthesis.pending) {
                      if (isSystemActiveRef.current) {
                          startListening();
                      } else {
                          setProcessingState('paused');
                      }
                  }
              };
          }

          window.speechSynthesis.speak(utterance);
      }
  };

  const askOllama = async (prompt: string, actionResult: string | null, availableCommands: string[]) => {
    setProcessingState('processing');
    try {
        const systemContext = `Context:\n- Action Taken: ${actionResult || 'None'}`;
        const fullPrompt = `
        User input:
        "${prompt}"
        
        ${systemContext}
        
        Instructions:
        • Respond in a minimal, formal British butler tone.
        • Do not reformulate the user's statement.
        • Avoid redundancy and filler.
        • Short answers only.
        • Do not prefix, suffix, explain, or mention character count.
        • Do not mention commands, functions, or that you are an AI.
        • If the input is not a command, treat it as conversation.
        • Never say "I don't have a command for that" or similar.
        * Address the user as "Sir" No name.
        `;
        // TALK DIRECTLY TO WINDOWS - Bypasses macOS Deno Sandbox
        const res = await fetch('http://192.168.100.35:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "phi3", // "llama3.1:8b",
                prompt: fullPrompt,
                stream: true
            })
        });

        if (!res.ok) throw new Error("Ollama connection failed");
        if (!res.body) throw new Error("No response body");

        setProcessingState('speaking');
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        window.speechSynthesis.cancel(); // Clear queue for new response

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullResponse = '';
        let sentenceBuffer = '';

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            const word = json.response;
                            fullResponse += word;
                            sentenceBuffer += word;
                            setLastWordDisplay(fullResponse);
                            
                            // Speak chunk if complete sentence detected
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
                            // Always call speakChunk with true at the end
                            speakChunk(sentenceBuffer, true);
                        }
                    } catch (e) {
                         console.error("JSON Parse error", e);
                    }
                }
            }
        }
    } catch (err) {
        console.error("Browser direct call failed:", err);
        speak("I could not reach the brain directly.");
    }
  };

  const startListening = () => {
      shouldListenRef.current = true;
      setProcessingState('listening');
      setStatusMessage("Listening...");
      transcriptBufferRef.current = '';
      accumulatedTranscriptRef.current = '';
      
      if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {
              // Ignore if already started
          }
      }
  };

  const handleSilenceDetected = async () => {
      const fullText = (accumulatedTranscriptRef.current + transcriptBufferRef.current).trim();
      if (!fullText) {
          return; 
      }
      
      console.log("Silence detected. Processing:", fullText);
      
      // Stop listening to process
      shouldListenRef.current = false; // Prevent auto-restart by onend immediate loop
      if (recognitionRef.current) recognitionRef.current.stop();
      
      setProcessingState('processing');
      setStatusMessage("Processing...");

      try {
          const commandList = Object.keys(commands);
          const prompt = `
          You are a command parser.
          User said: "${fullText}"
          Available commands:
          ${commandList.join('\n')}
          
          Instructions:
          1. Select the command from the list that EXACTLY matches the user's intent.
          2. Only return a command if the user explicitly requests that specific action.
          3. If the user is just greeting, chatting, or asking a general question not related to the commands, reply with 'NONE'.
          4. Do not guess. If unsure, reply 'NONE'.
          5. Reply with the exact command string from the list, or 'NONE'.
          `;
          
          // Silent LLM Request
          const res = await fetch('http://192.168.100.35:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "phi3", 
                prompt: prompt,
                stream: false
            })
          });
          
          if (!res.ok) throw new Error("Silent LLM request failed");
          
          const json = await res.json();
          const response = json.response;
          console.log("Silent LLM Response:", response);
          
          const matchedKey = commandList.find(key => response.includes(key));
          
          if (matchedKey) {
              console.log("Matched Command:", matchedKey);
              setCurrentWord(matchedKey);
              if (soundOfCoincidenceRef.current) {
                  soundOfCoincidenceRef.current.play().catch(e => console.log('Audio play failed', e));
              }
              
              const command = commands[matchedKey];
              const msg = await command.action();
              
              speak(msg || "Command executed.");
          } else {
              // Fallback to conversation
              await askOllama(fullText, null, commandList);
          }

      } catch (err) {
          console.error("Error in handleSilenceDetected", err);
          speak("I encountered an error.");
      }
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
        
        // Use full transcript from continuous results
        let t = '';
        for (let i = 0; i < event.results.length; ++i) {
            t += event.results[i][0].transcript;
        }
        
        transcriptBufferRef.current = t;
        setLastWordDisplay(accumulatedTranscriptRef.current + t);
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
      isSystemActiveRef.current = true;
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            startListening();
        })
        .catch((err) => {
            console.error("Microphone permission denied:", err);
            setStatusMessage("Permission Denied");
        });
  };

  const toggleListening = () => {
    if (isSystemActiveRef.current) {
      // Pause
      isSystemActiveRef.current = false;
      shouldListenRef.current = false;
      setProcessingState('paused');
      setStatusMessage("Paused");
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
    } else {
      // Resume
      isSystemActiveRef.current = true;
      startListening();
    }
  };

  const getStateColor = () => {
      switch(processingState) {
          case 'listening': return 'text-green-500';
          case 'processing': return 'text-blue-500';
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
              
              <button 
                onClick={toggleListening}
                className="mt-4 px-6 py-2 font-bold text-yellow-500 border border-yellow-500 rounded hover:bg-yellow-500 hover:text-black transition-colors"
              >
                {processingState === 'paused' ? 'RESUME' : 'PAUSE'}
              </button>

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
