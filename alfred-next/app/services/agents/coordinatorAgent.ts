import { getOllamaUrl } from "./utils";

export const runCoordinatorAgent = async (prompt: string) => {
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
        stream: false,
        options: { temperature: 0 }
      })
    });

    if (res.ok) {
      const json = await res.json();
      const response = json.response.trim();
      const match = response.match(/---(.*?)---/s);
      if (match) {
        try {
          const result = JSON.parse(match[1]);
          console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] Coordinator Agent result:", result);
          return result;
        } catch (e) {
          console.error("[alfred-next/app/services/agents/coordinatorAgent.ts] JSON parse failed:", e);
        }
      }
    }
  } catch (e) {
    console.error("[alfred-next/app/services/agents/coordinatorAgent.ts] Coordinator Agent failed:", e);
  }
  console.log("[alfred-next/app/services/agents/coordinatorAgent.ts] Returning fallback result.");
  return { commands: true, memory: true, conversational: true }; // Safe fallback
};
