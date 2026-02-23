import { getOllamaUrl } from "./utils";

export const runCoordinatorAgent = async (prompt: string, onToken: (count: number) => void) => {
  console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] runCoordinatorAgent() start.");
  try {
    const coordPrompt = `
      You are a Coordinator Agent. Analyze the user message and decide if we need to:
      1. commands: true; if Execute a command (e.g., play music, open link, paint, etc.)
      2. memory: true if Update memory (if the message contains new info about the user or context)
      3. conversational: if Reply to the user (if it's a question, a greeting, or needs a verbal response)
      
      Output EXACTLY a JSON object wrapped in triple dashes:
      ---{"commands": true or false, "memory":  true or false, "conversational":  true or false}---
      
      RULES:
      - ONLY output the JSON inside dashes.
      - NEVER explain yourself.
      
      User message: "${prompt}"
    `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: coordPrompt,
        stream: true,
        options: { temperature: 0 }
      })
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "No error details");
      throw new Error(`Coordinator stream failed (${res.status}): ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
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
            fullResponse += json.response;
            tokens++;
            onToken(tokens);
          }
        } catch (e) {}
      }
    }

    const match = fullResponse.match(/---(.*?)---/s);
    if (match) {
      try {
        const result = JSON.parse(match[1]);
        console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] Coordinator Agent result:", result);
        return result;
      } catch (e) {
        console.error("[alfred-next/app/services/agents/coordinatorAgent.ts] JSON parse failed:", e);
      }
    }
  } catch (e) {
    console.error("[alfred-next/app/services/agents/coordinatorAgent.ts] Coordinator Agent failed:", e);
  }
  console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] Returning fallback result.");
  return { commands: true, memory: true, conversational: true }; // Safe fallback
};
