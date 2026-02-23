import { CommandsRecord, AgentState } from "../../types/alfred";
import { getOllamaUrl, getBackendUrl } from "./utils";
import { runSearchAgent } from "./searchAgent";

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
    // Step 1: Trigger Search Agent (Delegated to searchAgent.ts)
    console.log("[alfred-next/app/services/agents/commandAgent.ts] runCommandAgent() Triggering Search Agent.");
    const availableCommands = await runSearchAgent(
      prompt, 
      (t) => onSearchToken?.(t), 
      (s) => updateStatus(s) // Search agent updates the commandSearch state
    );

    if (availableCommands.length === 0) {
      console.log("[alfred-next/app/services/agents/commandAgent.ts] No relevant commands found via Search Agent.");
      return;
    }

    // Step 2: Multi-Command Identification
    updateStatus('processing'); // Set command status back to processing for identification phase

    const cmdPrompt = `
      <|system|>
      OBJECTIVE:
      Identify if the user's request matches any of the available system commands.
      You can return MULTIPLE commands if the user requested several actions.

      Available Commands (Signatures):
      ${availableCommands.map((c: string) => `- ${c}`).join('\n')}

      FORMAT:
      Respond ONLY with a JSON array of objects wrapped in triple dashes. 
      Each object must contain:
      - "command": the base name of the command.
      - "args": an array of extracted arguments.

      If no match is found, respond ONLY with "[]".

      EXAMPLE:
      User: "play jazz and paint blue"
      Result: ---[{"command": "play_music", "args": ["jazz"]}, {"command": "paint", "args": ["blue"]}]---

      CONTEXT:
      ${context}

      USER MESSAGE:
      "${prompt}"
      <|assistant|>
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
      if (cleanResponse.includes('[]') || cleanResponse.toLowerCase().includes('null')) {
        console.log("[alfred-next/app/services/agents/commandAgent.ts] No commands matched.");
        return;
      }

      const match = cleanResponse.match(/---(.*?)---/s);
      if (match) {
        const parsedArray = JSON.parse(match[1]);
        if (Array.isArray(parsedArray)) {
          for (const parsed of parsedArray) {
            if (parsed && parsed.command) {
              const { command, args } = parsed;
              const sanitizedArgs = Array.isArray(args) ? args : [];
              console.log(`[alfred-next/app/services/agents/commandAgent.ts] Parsed command: ${command}, args:`, sanitizedArgs);

              if (commands[command]) {
                // Send to callback for UI/Local feedback
                onCommandMatched({ command, args: sanitizedArgs });
                
                // Construct pulse locally to avoid LLM JSON escaping issues
                const pulseArgs = sanitizedArgs.map(arg => typeof arg === 'string' ? `"${arg}"` : arg).join(', ');
                const pulse = `${command}(${pulseArgs})`;

                console.log("[alfred-next/app/services/agents/commandAgent.ts] Sending pulse to server:", pulse);
                fetch(`${getBackendUrl()}/api/commands`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pulse })
                }).catch(err => console.error("[alfred-next/app/services/agents/commandAgent.ts] Failed to send command to server", err));
              } else {
                console.warn(`[alfred-next/app/services/agents/commandAgent.ts] Command "${command}" not found in client commands record.`);
              }
            }
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
