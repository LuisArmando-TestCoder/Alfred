import { CommandsRecord, AgentState } from "../../types/alfred";
import { getOllamaUrl } from "./utils";

export const runCommandAgent = async (
  prompt: string, 
  context: string, 
  commands: CommandsRecord, 
  onCommandMatched: (match: { command: string, args: (string | number)[] }) => void,
  updateStatus: (state: AgentState) => void,
  onToken: (count: number) => void
) => {
  console.log("[alfred-next/app/services/agents/commandAgent.ts] runCommandAgent() start.");
  try {
    // Phase 2.1: Command Search (Inside Command Agent)
    console.log("[alfred-next/app/services/agents/commandAgent.ts] runCommandAgent() Phase: Command Search.");
    updateStatus('processing');
    
    const searchRes = await fetch('http://localhost:8000/api/commands');
    const searchData = await searchRes.json();
    const availableCommands = searchData.commands || [];
    console.log("[alfred-next/app/services/agents/commandAgent.ts] Found available commands from server:", availableCommands);
    
    updateStatus('success');

    const cmdPrompt = `
      You are a Command Agent. Analyze the message and context to decide if a command should be executed.
      
      CRITICAL RULES:
      1. IF MATCH: Output EXACTLY >> execute:commandName("arg1", "arg2", ...) >>
      2. IF NO MATCH: Output ONLY dots .......
      3. NEVER EXPLAIN YOURSELF. DO NOT OUTPUT ANY OTHER TEXT.
      4. Arguments MUST be quoted if strings.
      
      Available Commands:
      ${availableCommands.map((c: string) => `- ${c}`).join('\n')}
      
      Context: ${context}
      User: "${prompt}"
      `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: cmdPrompt,
        stream: true,
        options: { temperature: 0 }
      })
    });

    if (!res.ok || !res.body) {
      console.error("[alfred-next/app/services/agents/commandAgent.ts] Ollama request failed.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let response = '';
    let tokens = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.response) {
            response += json.response;
            tokens++;
            onToken(tokens);
          }
        } catch (e) {}
      }
    }
    
    console.log("[alfred-next/app/services/agents/commandAgent.ts] Command Agent raw response:", response);

    const match = response.match(/>>\s*execute:(\w+)\((.*)\)\s*>>/);
    if (match) {
      console.log("[alfred-next/app/services/agents/commandAgent.ts] Command pattern matched.");
      const command = match[1];
      const argsString = match[2];
      
      // Basic argument parsing (splitting by comma and removing quotes)
      const args: (string | number)[] = argsString.split(',')
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
    throw err;
  }
};
