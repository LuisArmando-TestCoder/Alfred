import { corsHeaders } from "../utils.ts";
import { getMarkdownMemory, saveMarkdownMemory } from "../memory/markdown.ts";

export const handleContextRaw = async (req: Request) => {
    console.log("[deno/controllers/context.ts] handleContextRaw() start.");
    try {
        if (req.method === "GET") {
            console.log("[deno/controllers/context.ts] GET request for context.");
            const content = await getMarkdownMemory("context");
            return Response.json({ content }, { headers: corsHeaders });
        } else if (req.method === "POST") {
            console.log("[deno/controllers/context.ts] POST request to update context.");
            const body = await req.json();
            const { content: newContent } = body;
            
            const oldContent = await getMarkdownMemory("context");
            
            // Simple line-based diff
            const oldLines = oldContent.split("\n").map(l => l.trim()).filter(l => l !== "");
            const newLines = newContent.split("\n").map(l => l.trim()).filter(l => l !== "");
            
            const added = newLines.filter(l => !oldLines.includes(l));
            const removed = oldLines.filter(l => !newLines.includes(l));
            
            let diffMessage = "";
            if (added.length > 0) {
                diffMessage += `Added: ${added.join(", ")}. `;
            }
            if (removed.length > 0) {
                diffMessage += `Removed: ${removed.join(", ")}. `;
            }
            
            console.log(`[deno/controllers/context.ts] Saving context. Diff: ${diffMessage || "None"}`);
            await saveMarkdownMemory("context", newContent);
            
            return Response.json({ 
                success: true, 
                diff: diffMessage.trim() || "No significant changes." 
            }, { headers: corsHeaders });
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    } catch (e) {
        return new Response(`Error: ${e instanceof Error ? e.message : String(e)}`, { status: 500, headers: corsHeaders });
    }
};
