export const runPonderingAgent = async (prompt: string) => {
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

export const runContextManager = async (prompt: string, currentContext: string) => {
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

export const runCommandAgent = async (prompt: string, context: string, commands: Record<string, any>, onCommandMatched: (key: string) => void) => {
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
      onCommandMatched(matchedKey);
    }
  } catch (err) {
    console.error("Command Agent failed", err);
  }
};

export const runConversationAgent = async (
  prompt: string, 
  mdContext: string, 
  callbacks: {
    onWord: (fullResponse: string) => void,
    onSentence: (sentence: string) => void,
    onComplete: (sentence: string) => void,
    onError: (err: any) => void
  }
) => {
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
              callbacks.onWord(fullResponse);

              let match = sentenceBuffer.match(/([.!?\n]+)/);
              if (match) {
                const index = match.index! + match[0].length;
                const toSpeak = sentenceBuffer.substring(0, index);
                const remainder = sentenceBuffer.substring(index);
                callbacks.onSentence(toSpeak);
                sentenceBuffer = remainder;
              }
            }
            if (json.done) {
              callbacks.onComplete(sentenceBuffer);
            }
          } catch (e) {
            console.error("JSON Parse error", e);
          }
        }
      }
    }
  } catch (err) {
    callbacks.onError(err);
  }
};
