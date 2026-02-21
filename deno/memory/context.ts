import { getGraphContext } from "./graph.ts";
import { getMarkdownMemory, appendMarkdownMemory } from "./markdown.ts";
import { callLLM } from "../services/llm.ts";
import { getDataPath } from "../utils.ts";

const HISTORY_FILE = getDataPath("memories/history.json");
const MAX_HISTORY_LENGTH = 10;

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

export async function getConversationContext(userMessage: string): Promise<string> {
    let history: Message[] = [];
    try {
        const data = await Deno.readTextFile(HISTORY_FILE);
        history = JSON.parse(data);
    } catch {
        // Create empty if needed
    }

    // Summarization logic moved to browser/manual to comply with "server should not call LLMs"
    /*
    if (history.length > MAX_HISTORY_LENGTH) {
        await summarizeHistory(history);
        ...
    }
    */

    // Graph Context
    // Extract keywords from userMessage? Or just pass the whole thing.
    // Ideally we extract entities. For now, simple search.
    const graphContext = await getGraphContext(userMessage);

    // Markdown Context
    let markdownContext = "";
    try {
        const prefs = await getMarkdownMemory("context");
        if (prefs) markdownContext += `User Preferences:\n${prefs}\n`;
        
        const summaries = await getMarkdownMemory("summaries");
        if (summaries) {
             // Take last few lines of summaries?
             const lines = summaries.split("\n");
             const recentSummaries = lines.slice(-5).join("\n");
             markdownContext += `Previous Summaries:\n${recentSummaries}\n`;
        }
    } catch {}

    let context = "Context:\n";
    if (markdownContext) context += `${markdownContext}\n`;
    if (graphContext) context += `Knowledge Graph:\n${graphContext}\n`;
    
    context += `Recent Conversation:\n`;
    history.forEach(msg => {
        context += `${msg.role}: ${msg.content}\n`;
    });

    return context;
}

export async function appendHistory(role: "user" | "assistant", content: string) {
    let history: Message[] = [];
    try {
        const data = await Deno.readTextFile(HISTORY_FILE);
        history = JSON.parse(data);
    } catch {}
    
    history.push({ role, content, timestamp: Date.now() });
    await Deno.writeTextFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function summarizeHistory(history: Message[]) {
    // Summarize older half
    const cutoff = Math.floor(history.length / 2);
    const toSummarize = history.slice(0, cutoff);
    const kept = history.slice(cutoff);
    
    if (toSummarize.length === 0) return;

    const conversationText = toSummarize.map(m => `${m.role}: ${m.content}`).join("\n");
    const prompt = `Summarize the following conversation key points in 1-2 sentences:\n${conversationText}`;
    
    try {
        const result = await callLLM({
            model: "phi3",
            prompt: prompt,
            stream: false
        });
        
        const summary = result.response;
        await appendMarkdownMemory("summaries", `Summary: ${summary}`);
        
        // Save truncated history
        await Deno.writeTextFile(HISTORY_FILE, JSON.stringify(kept, null, 2));
        
    } catch (e) {
        console.error("Failed to summarize history:", e);
    }
}
