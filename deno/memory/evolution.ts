import { callLLM } from "../services/llm.ts";
import { addNode, addEdge, GraphNode, GraphEdge } from "./graph.ts";
import { saveMarkdownMemory, appendMarkdownMemory } from "./markdown.ts";

interface MemoryUpdate {
    new_nodes?: Omit<GraphNode, "timestamp">[];
    new_edges?: GraphEdge[];
    markdown_updates?: { filename: string, content: string, action: "overwrite" | "append" }[];
    summary?: string;
}

export async function processMemory(userInput: string, assistantResponse: string): Promise<void> {
    const prompt = `
    Analyze the following interaction between User and Assistant.
    Extract key entities, facts, and user preferences.
    
    User: "${userInput}"
    Assistant: "${assistantResponse}"
    
    Output a JSON object with the following structure:
    {
        "new_nodes": [ { "id": "unique_id", "type": "person|place|concept", "content": "description" } ],
        "new_edges": [ { "source": "id1", "target": "id2", "relation": "verb", "weight": 1 } ],
        "markdown_updates": [ { "filename": "context", "content": "- User likes X", "action": "append" } ],
        "summary": "Brief summary of the interaction for history log"
    }
    Only output valid JSON. No other text.
    `;

    try {
        const response = await callLLM({
            model: "phi3", // Using phi3 as seen in other files, or maybe a smaller model if available
            prompt: prompt,
            stream: false,
            options: { temperature: 0, num_predict: 500 }
        });

        const jsonStr = response.response; // Ollama standard response field
        // Basic cleanup if markdown blocks are included
        const cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const updates: MemoryUpdate = JSON.parse(cleanJson);

        // Apply updates
        if (updates.new_nodes) {
            for (const node of updates.new_nodes) {
                await addNode(node);
            }
        }

        if (updates.new_edges) {
            for (const edge of updates.new_edges) {
                await addEdge(edge);
            }
        }

        if (updates.markdown_updates) {
            for (const update of updates.markdown_updates) {
                if (update.action === "overwrite") {
                    await saveMarkdownMemory(update.filename, update.content);
                } else {
                    await appendMarkdownMemory(update.filename, update.content);
                }
            }
        }
        
        console.log("Memory evolved successfully.");

    } catch (error) {
        console.error("Error evolving memory:", error);
    }
}
