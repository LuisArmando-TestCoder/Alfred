import { corsHeaders, getDataPath } from "../utils.ts";
import { getConversationContext } from "../memory/context.ts";
import { getMarkdownMemory, saveMarkdownMemory } from "../memory/markdown.ts";

export const handleContext = async (req: Request) => {
    try {
        const body = await req.json();
        const prompt = body.prompt || "";
        
        console.log("Retrieving context for:", prompt);
        const context = await getConversationContext(prompt);
        
        return Response.json({ context }, { headers: corsHeaders });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};

export const handleContextRaw = async (req: Request) => {
    try {
        if (req.method === "GET") {
            const content = await getMarkdownMemory("context");
            return Response.json({ content }, { headers: corsHeaders });
        } else if (req.method === "POST") {
            const body = await req.json();
            const { content } = body;
            await saveMarkdownMemory("context", content);
            return Response.json({ success: true }, { headers: corsHeaders });
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};

export const handleHistory = async (req: Request) => {
    try {
        const historyFile = getDataPath("memories/history.json");
        let history = [];
        try {
            const data = await Deno.readTextFile(historyFile);
            history = JSON.parse(data);
        } catch {
            // Empty history
        }
        return Response.json({ history }, { headers: corsHeaders });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};
