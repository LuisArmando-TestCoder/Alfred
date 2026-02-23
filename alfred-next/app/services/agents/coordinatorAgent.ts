import { getOllamaUrl } from "./utils";

export const runCoordinatorAgent = async (prompt: string) => {
  try {
    const coordPrompt = `
      You are a Coordinator Agent. Analyze the user message and decide if we need to:
      1. Execute a command (e.g., play music, open link, paint, etc.)
      2. Update memory (if the message contains new info about the user or context)
      
      Output EXACTLY a JSON object wrapped in triple dashes:
      ---{"commands": boolean, "memory": boolean}---
      
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
          return JSON.parse(match[1]);
        } catch (e) {
          console.error("JSON parse failed in Coordinator", e);
        }
      }
    }
  } catch (e) {
    console.error("Coordinator Agent failed", e);
  }
  return { commands: true, memory: true }; // Safe fallback
};
