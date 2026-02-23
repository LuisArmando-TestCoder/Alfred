import { getOllamaUrl } from "./utils";

export const runPonderingAgent = async (prompt: string) => {
  try {
    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: `Determine if the following message requires deep philosophical thought, complex reasoning, or emotional reflection. 
        Message: "${prompt}"
        Answer ONLY "YES" or "NO".`,
        stream: false,
        options: { temperature: 0 }
      })
    });
    if (res.ok) {
      const json = await res.json();
      return json.response.trim().toUpperCase().includes('YES');
    }
  } catch (e) {
    console.error("Pondering agent failed", e);
    throw e; // Re-throw to allow UI to handle it
  }
  return false;
};
