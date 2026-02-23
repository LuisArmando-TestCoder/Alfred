import { getOllamaUrl } from "./utils";

export const runContextManager = async (prompt: string, currentContext: string, onToken: (count: number) => void) => {
  console.log("[alfred-next/app/services/agents/contextAgent.ts] runContextManager() start.");
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

        Example of Context Update:
        If the user says "Remember that I have a meeting at 3pm", you might update the context with:
        meetingAt:3pm

        If the user says "I am feeling sad", you might update the context with:
        emotionalState:sad

        If the user says "I like Italian food", you might update the context with:
        foodPreference:italian

        everything in the context should be in this format. Always return the FULL context with updates, never just the new pieces.
        and it would end up looking like:
        meetingAt:3pm
        emotionalState:sad
        foodPreference:italian
        
        User said: "${prompt}"
        `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: crudPrompt,
        stream: true,
        options: { temperature: 0 }
      })
    });

    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "No error details");
      throw new Error(`Context Manager stream failed (${res.status}): ${errorText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let newContext = '';
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
            newContext += json.response;
            tokens++;
            onToken(tokens);
          }
        } catch (e) {
          console.warn("[alfred-next/app/services/agents/contextAgent.ts] Failed to parse JSON line:", line);
        }
      }
    }

    newContext = newContext.trim();
    console.log("[alfred-next/app/services/agents/contextAgent.ts] Context LLM generated new content.");

    // Save new context to server and get diff
    console.log("[alfred-next/app/services/agents/contextAgent.ts] Sending update to Deno server...");
    const saveRes = await fetch('http://localhost:8000/api/context/raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContext })
    });

    if (saveRes.ok) {
      const saveData = await saveRes.json();
      console.log("[alfred-next/app/services/agents/contextAgent.ts] Server saved memory. Diff:", saveData.diff);
      return {
        content: newContext,
        diff: saveData.diff || ""
      };
    }
    
    return { content: newContext, diff: "" };
  } catch (e) {
    console.error("Context Manager failed", e);
    throw e;
  }
};
