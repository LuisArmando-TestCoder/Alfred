import { corsHeaders } from "../utils.ts";
import { getMarkdownMemory, saveMarkdownMemory } from "../memory/markdown.ts";

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
