import { corsHeaders } from "../utils.ts";
import { addNode, addEdge } from "../memory/graph.ts";
import { saveMarkdownMemory, appendMarkdownMemory } from "../memory/markdown.ts";
import { appendHistory } from "../memory/context.ts";

export const handleEvolutionApply = async (req: Request) => {
    try {
        const body = await req.json();
        const { prompt, response, updates } = body;
        
        console.log("Applying memory updates from browser...");

        if (prompt && response) {
            await appendHistory("user", prompt);
            await appendHistory("assistant", response);
        }

        if (updates) {
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
        }
        
        return Response.json({ success: true }, { headers: corsHeaders });
    } catch (e: any) {
        console.error("Evolution apply failed:", e);
        return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};
