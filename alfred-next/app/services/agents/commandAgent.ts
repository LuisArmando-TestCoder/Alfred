import { CommandsRecord } from "../../types/alfred";
import { getOllamaUrl } from "./utils";

export const runCommandAgent = async (
  prompt: string, 
  context: string, 
  commands: CommandsRecord, 
  onCommandMatched: (match: { command: string, args: (string | number)[] }) => void
) => {
  try {
    const cmdPrompt = `
      You are a Command Agent. Analyze the message and context to decide if a command should be executed.
      
      CRITICAL RULES:
      1. IF MATCH: Output EXACTLY >> execute:commandName("arg1", "arg2", ...) >>
      2. IF NO MATCH: Output ONLY dots .......
      3. NEVER EXPLAIN YOURSELF. DO NOT OUTPUT ANY OTHER TEXT.
      4. Arguments MUST be quoted if strings.
      
      Available Commands:
      - play_music(mood): mood can be "nice", "powerful", "funny", "sad", "awesome".
      - open_link(site): site can be "study", "board", "work", "storage", "library", "space", "editor", "dashboard", "body", "anime", "entertainment", "project", "regular", "challenge".
      - paint(color): color can be "blue", "yellow", "pink", "black".
      - get_time(): current time.
      - get_info(topic): browser, environment, creator, identity, life.
      
      Context: ${context}
      User: "${prompt}"
      `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: cmdPrompt,
        stream: false,
        options: { temperature: 0 }
      })
    });

    if (!res.ok) return;
    const json = await res.json();
    const response = json.response.trim();
    
    console.log("Command Agent raw response:", response);

    const match = response.match(/>>\s*execute:(\w+)\((.*)\)\s*>>/);
    if (match) {
      const command = match[1];
      const argsString = match[2];
      
      // Basic argument parsing (splitting by comma and removing quotes)
      const args: (string | number)[] = argsString.split(',')
        .map((arg: string) => arg.trim())
        .filter((arg: string) => arg.length > 0)
        .map((arg: string) => {
          if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
          if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1);
          if (!isNaN(Number(arg))) return Number(arg);
          return arg;
        });

      onCommandMatched({ command, args });
    }
  } catch (err) {
    console.error("Command Agent failed", err);
    throw err;
  }
};
