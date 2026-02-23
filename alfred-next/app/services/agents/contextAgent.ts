import { getOllamaUrl } from "./utils";

export const runContextManager = async (prompt: string, currentContext: string) => {
  try {
    const crudPrompt = `
        You are a Context Manager. Update the Context file based on the interaction.
        Format: verboseProperty:conciseValue (camelCase, NO spaces, colons for separation).
        
        CRITICAL RULES:
        1. OUTPUT ONLY the plain text content.
        2. NO markdowns (no \`\`\`), NO headers, NO explanations.
        3. NEVER EXPLAIN YOURSELF.
        4. MANDATORY: Use a NEW LINE for each pair.
        5. Return the ENTIRE updated context.
        
        Current Context:
        ${currentContext}
        
        User said: "${prompt}"
        `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
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
    throw e;
  }
};
