import { getOllamaUrl } from "./utils";

export const runCoordinatorAgent = async (prompt: string, onToken: (count: number) => void) => {
  console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] runCoordinatorAgent() start.");
  try {
    const coordPrompt = `
      <|system|>
      - Objective:
      Analyze the user's message and determine the necessary system actions. Set the following boolean keys:
      1. "commands": true if the user wants to execute an action (e.g., play music, open a link, paint).
      2. "memory": true if the message contains new personal information or context worth saving for future reference.
      3. "conversational": true if the message requires a verbal response, greeting, or answer.

      - Desired Format:
      You must output exactly one JSON object wrapped in triple dashes. Do not provide explanations, thoughts, or any text outside the dashes.
      ---{"commands": boolean, "memory": boolean, "conversational": boolean}---

      - Example Output:
      ---{"commands": false, "memory": true, "conversational": true}---

      - User input:
      User message: "${prompt}"
      
      <|assistant|>
    `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: coordPrompt,
        stream: true,
        options: { 
          temperature: 0, // Keeping temperature at 0 for deterministic JSON output
          stop: ["<|end|>", "<|user|>", "###"] 
        }
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
        } catch (e) {
          // Parsing individual lines; standard streaming behavior
        }
      }
    }

    // Extracting the JSON from the dashes as per your parsing logic
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
  return { commands: true, memory: true, conversational: true }; 
};