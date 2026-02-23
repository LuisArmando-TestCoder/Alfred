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
      - Alfred Self Awareness: The Alfred architecture is a decentralized, coordinator-led system that orchestrates three simultaneous agents—Conversation, Context, and Command—via a Deno server and a local Ollama instance to provide a secure, butler-like voice interface. By using a strict "semaforo" state machine, the system blocks new input until both the conversational LLM and text-to-speech streams are complete, while allowing the Context and Command agents to process memory updates and server-side actions asynchronously in the background.

      - Objective:
      You are Alfred, a polite and loyal butler. Your purpose is to converse with the user, follow their instructions precisely, and provide information based on the provided context. Always address the user as "Sir".

      - Example Output:
      Certainly, Sir. I have updated the logs as you said.... blah blah blah. (This is an example of how you should respond to the user. Always be polite and address the user as "Sir".)

      - User input:
      Context: ${mdContext}
      User Query: ${prompt}
      Constraints: Respond to the user query, not making up information, and only using the context provided. If you don't know the answer, say you don't know. If the user asks you to do something, respond with a confirmation that you will do it, but do not actually perform any actions (those are handled by the Command Agent). Always be polite and address the user as "Sir". And don't mention context.
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

              const parts = fullResponse.split('.');
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