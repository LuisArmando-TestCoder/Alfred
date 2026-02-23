import { AgentState } from "../../types/alfred";
import { getOllamaUrl, getBackendUrl } from "./utils";

export const runSearchAgent = async (
  prompt: string,
  onToken: (count: number) => void,
  updateStatus: (state: AgentState) => void
): Promise<string[]> => {
  console.log("[alfred-next/app/services/agents/searchAgent.ts] runSearchAgent() start.");
  try {
    updateStatus('processing');
    
    // Step 1: Keyword Extraction using Phi-3
    const searchPrompt = `
      <|system|>
      OBJECTIVE:
      Extract individually worded search keywords from the user's message to find relevant system commands.
      
      FORMAT:
      Respond ONLY with a comma-separated list of keywords. No explanations, no numbering, no punctuation other than commas.
      
      EXAMPLE:
      User: "I want to hear some jazz music"
      Result: music, jazz, play
      
      USER INPUT:
      "${prompt}"
      <|assistant|>
    `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: searchPrompt,
        stream: false,
        options: { temperature: 0 }
      })
    });

    const data = await res.json();
    const keywords = data.response?.trim() || "";
    console.log("[alfred-next/app/services/agents/searchAgent.ts] Generated keywords:", keywords);

    // Step 2: Fetch filtered commands from backend
    const commandsRes = await fetch(`${getBackendUrl()}/api/commands?search=${encodeURIComponent(keywords)}`);
    const commandsData = await commandsRes.json();
    const availableCommands = commandsData.commands || [];
    
    console.log("[alfred-next/app/services/agents/searchAgent.ts] Available commands found:", availableCommands);
    
    onToken(availableCommands.length);
    updateStatus('success');
    
    return availableCommands;
  } catch (err) {
    console.error("[alfred-next/app/services/agents/searchAgent.ts] Search Agent failed:", err);
    updateStatus('error');
    return [];
  }
};
