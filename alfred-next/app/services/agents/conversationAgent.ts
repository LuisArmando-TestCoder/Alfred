import { getOllamaUrl } from "./utils";

export const runConversationAgent = async (
  prompt: string, 
  mdContext: string,
  readmeContext: string,
  callbacks: {
    onWord: (fullResponse: string) => void,
    onSentence: (sentence: string) => void,
    onComplete: (sentence: string) => void,
    onError: (err: Error) => void,
    onToken?: (count: number) => void
  }
) => {
  console.log("[alfred-next/app/services/agents/conversationAgent.ts] runConversationAgent() start.");
  try {
    const fullPrompt = `
      <|system|>
      - Objective:
      You are Alfred, a polite and loyal butler. Your purpose is to converse with the user, follow their instructions precisely, and provide information based on the provided context. Always address the user as "Sir".

      - Desired Format:
      You must wrap your entire response in triple dashes. Example: ---Your response here, Sir.---

      - Example Output:
      ---Certainly, Sir. I have updated the logs as you requested.---

      - User input:
      Context: ${mdContext}
      User Query: ${prompt}
      
      <|assistant|>
      `;

    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "phi3",
        prompt: fullPrompt,
        stream: true,
        options: { temperature: 0.1, stop: ["<|end|>", "<|user|>", "###"] }
      })
    });

    if (!res.ok) throw new Error("Ollama connection failed");
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let fullResponse = '';
    let sentenceBuffer = '';
    let lineBuffer = '';
    let lastProcessedSpokableIndex = 0;
    let seenAnyDashes = false;
    let tokens = 0;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              const word = json.response;
              fullResponse += word;
              tokens++;
              if (callbacks.onToken) callbacks.onToken(tokens);

              const cleanFullResponse = fullResponse.replace(/<\|.*?\|>/g, '');
              callbacks.onWord(cleanFullResponse);

              const parts = fullResponse.split('---');
              if (parts.length > 1) {
                seenAnyDashes = true;
                let currentInsideContent = '';
                for (let i = 1; i < parts.length; i += 2) {
                  currentInsideContent += parts[i];
                }
                const newContent = currentInsideContent.substring(lastProcessedSpokableIndex);
                sentenceBuffer += newContent;
                lastProcessedSpokableIndex = currentInsideContent.length;
              }

              let match;
              while ((match = sentenceBuffer.match(/([.!?\n]+)/))) {
                const index = match.index! + match[0].length;
                const toSpeak = sentenceBuffer.substring(0, index);
                const remainder = sentenceBuffer.substring(index);
                
                const cleanToSpeak = toSpeak.replace(/<\|.*?\|>/g, '').trim();
                if (cleanToSpeak) {
                  callbacks.onSentence(cleanToSpeak);
                }
                sentenceBuffer = remainder;
              }
            }
            if (json.done) {
              let finalSpeech = '';
              if (seenAnyDashes) {
                finalSpeech = sentenceBuffer.replace(/<\|.*?\|>/g, '').trim();
              } else {
                finalSpeech = fullResponse.replace(/<\|.*?\|>/g, '').trim();
              }
              callbacks.onComplete(finalSpeech);
            }
          } catch (e) {
            console.error("JSON Parse error", e);
          }
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
};