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
      OBJECTIVE:
      Identify if the user's request matches any of the available system commands.
      Available Commands (Signatures):
      ${availableCommands.map((c: string) => `- ${c}`).join('\n')}

      FORMAT:
      Respond ONLY with a JSON object wrapped in triple dashes. 
      The JSON must contain:
      - "command": the base name of the command.
      - "args": an array of extracted arguments.
      - "pulse": a string representation of the command for server execution, e.g., "command(\"arg1\", 2)".

      If no match is found, respond ONLY with "null".

      EXAMPLE:
      User: "play jazz"
      Result: ---{"command": "play_music", "args": ["jazz"], "pulse": "play_music(\"jazz\")"}---

      USER MESSAGE:
      "${prompt}"

      CONTEXT:
      ${context}
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

    try {
      const cleanResponse = response.trim();
      if (cleanResponse.toLowerCase().includes('null')) {
        console.log("[alfred-next/app/services/agents/commandAgent.ts] No command matched (null).");
        return;
      }

      const match = cleanResponse.match(/---(.*?)---/s);
      if (match) {
        const parsed = JSON.parse(match[1]);
        if (parsed && parsed.command) {
          const { command, args, pulse } = parsed;
          console.log(`[alfred-next/app/services/agents/commandAgent.ts] Parsed command: ${command}, args:`, args);

          if (commands[command]) {
            // Send to callback for UI/Local feedback
            onCommandMatched({ command, args: Array.isArray(args) ? args : [] });
            
            // Execute on server via pulse if available
            if (pulse) {
              console.log("[alfred-next/app/services/agents/commandAgent.ts] Sending pulse to server:", pulse);
              fetch(`${getBackendUrl()}/api/commands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pulse })
              }).catch(err => console.error("[alfred-next/app/services/agents/commandAgent.ts] Failed to send command to server", err));
            }
          } else {
            console.warn(`[alfred-next/app/services/agents/commandAgent.ts] Command "${command}" not found in client commands record.`);
          }
        }
      }
    } catch (e) {
      console.error("[alfred-next/app/services/agents/commandAgent.ts] Failed to parse command JSON:", e, response);
    }
  } catch (err) {
    console.error("Command Agent failed", err);
    throw err;
  }
};
