import { CommandsRecord, AgentState } from "../../types/alfred";
import { getOllamaUrl, getBackendUrl } from "./utils";

export const runCommandAgent = async (
  prompt: string, 
  context: string, 
  commands: CommandsRecord, 
  onCommandMatched: (match: { command: string, args: (string | number)[] }) => void,
  updateStatus: (state: AgentState) => void,
  onToken: (count: number) => void,
  onSearchToken?: (count: number) => void
) => {
  console.log("[alfred-next/app/services/agents/commandAgent.ts] runCommandAgent() start.");
  try {
    // Phase 2.1: Command Search (Inside Command Agent)
    console.log("[alfred-next/app/services/agents/commandAgent.ts] runCommandAgent() Phase: Command Search.");
    updateStatus('processing');
    
    const searchRes = await fetch(`${getBackendUrl()}/api/commands`);
    const searchData = await searchRes.json();
    const availableCommands = searchData.commands || [];
    console.log("[alfred-next/app/services/agents/commandAgent.ts] Found available commands from server:", availableCommands);
    
    if (onSearchToken) onSearchToken(availableCommands.length);
    updateStatus('success');

    const cmdPrompt = `
      You are Alfred's Command Agent. Your job is to identify if the user's request matches any of the available system commands.
      
      Available System Commands (Server-side Signatures):
      ${availableCommands.map((c: string) => `- ${c}`).join('\n')}
      
      Current System Context:
      ${context}

      User Request: "${prompt}"

      CRITICAL INSTRUCTIONS:
      1. Analyze if the User Request requires any of the Available System Commands.
      2. If a match is found, you MUST respond with the exact execution pattern: >> execute:commandName(args) >>
      3. You MUST fill the arguments based on the function signature and the User Request.
      4. Arguments MUST be quoted if they are strings.
      5. If multiple arguments are needed, separate them with commas.
      6. IF NO COMMAND MATCHES, respond ONLY with dots: .......
      7. NEVER explain your reasoning. NEVER provide conversational text. ONLY the execution pattern or dots.
      8. If the user refers to something in the context that implies a command (e.g., "play that music" and context says mood is "sad"), use it.

      Example Match: >> execute:play_music("nice") >>
      Example Match: >> execute:get_info("weather") >>
      Example No Match: .......
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
      const errorText = await res.text().catch(() => "No error details");
      console.error(`[alfred-next/app/services/agents/commandAgent.ts] Ollama request failed (${res.status}): ${errorText}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let response = '';
    let tokens = 0;
    let lineBuffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

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

    // Improved regex to handle potential whitespace and multiple matches if LLM gets chatty
    const match = response.match(/>>\s*execute:(\w+)\s*\((.*)\)\s*>>/);
    if (match) {
      console.log("[alfred-next/app/services/agents/commandAgent.ts] Command pattern matched.");
      const command = match[1];
      const argsString = match[2];
      
      // Better argument parsing using regex to handle quoted strings with commas
      const args: (string | number)[] = [];
      const argRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^,\s]+)/g;
      let argMatch;

      while ((argMatch = argRegex.exec(argsString)) !== null) {
        const val = argMatch[1] || argMatch[2] || argMatch[3];
        if (val !== undefined) {
          if (!isNaN(Number(val)) && argMatch[3]) {
            args.push(Number(val));
          } else {
            args.push(val);
          }
        }
      }

      console.log(`[alfred-next/app/services/agents/commandAgent.ts] Parsed command: ${command}, args:`, args);

      // Verify command exists on client before calling callback
      if (commands[command]) {
        onCommandMatched({ command, args });
      } else {
        console.warn(`[alfred-next/app/services/agents/commandAgent.ts] Command "${command}" not found in client commands record.`);
      }
    }
  } catch (err) {
    console.error("Command Agent failed", err);
    throw err;
  }
};
