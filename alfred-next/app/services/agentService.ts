import { CommandsRecord } from "../types/alfred";

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

export const runCommandAgent = async (
  prompt: string, 
  context: string, 
  commands: CommandsRecord, 
  onCommandMatched: (match: { command: string, args: any[] }) => void
) => {
  try {
    const commandList = Object.keys(commands);
    const cmdPrompt = `
      You are a Command Agent. Your job is to analyze the user message and context to decide if a command should be executed.
      
      Context:
      ${context}
      
      User said: "${prompt}"
      
      Available Commands and valid arguments:
      - play_music(mood): mood can be "nice", "powerful", "funny", "sad", "awesome".
      - open_link(site): site can be "study", "board", "work", "storage", "library", "space", "editor", "dashboard", "body", "anime", "entertainment", "project", "regular", "challenge".
      - paint(color): color can be "blue", "yellow", "pink", "black".
      - get_time(): returns the current time.
      - get_info(topic): topic can be "browser", "environment" (PC info), "creator", "identity", "life".
      
      Instructions:
      1. If a command is requested, output EXACTLY this format:
         >> execute:commandName("arg1", "arg2", ...) >>
      2. If no command is requested, output ONLY dots: .......
      3. Use the most appropriate command based on the user's intent.
      4. Arguments MUST be quoted if they are strings.
      
      Example:
      User: "Put some happy music"
      Output: >> execute:play_music("happy") >>
      
      User: "I want to see my github"
      Output: >> execute:open_link("work") >>
      
      User: "Make the screen blue"
      Output: >> execute:paint("blue") >>

      User: "Hello Alfred"
      Output: .......
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
    
    console.log("Command Agent raw response:", response);

    const match = response.match(/>>\s*execute:(\w+)\((.*)\)\s*>>/);
    if (match) {
      const command = match[1];
      const argsString = match[2];
      
      // Basic argument parsing (splitting by comma and removing quotes)
      const args = argsString.split(',')
        .map((arg: string) => arg.trim())
        .filter((arg: string) => arg.length > 0)
        .map((arg: string) => {
          if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
          if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1);
          if (!isNaN(Number(arg))) return Number(arg);
          return arg;
        });

      onCommandMatched({ command, args });
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
      Persona: Minimal formal British butler named Alfred. Address the user as Sir.
      Background: You are part of a system with 3 agents (Conversation, Context, Command). 
      Capabilities: You can play music, open links, paint the background, tell the time, and provide environment info.
      Available Commands (Internal Knowledge - Do NOT mention unless asked):
      - play_music(mood)
      - open_link(site)
      - paint(color)
      - get_time()
      - get_info(topic)
      
      Constraint 1: ONLY output natural language.
      Constraint 2: NEVER output command syntax, context properties, or instructions.
      Constraint 3: Be extremely concise and compact. One short sentence maximum.
      Constraint 4: Do NOT mention your internal command knowledge unless the user asks what you can do.
      
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
