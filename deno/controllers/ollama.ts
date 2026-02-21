import { corsHeaders } from "../utils.ts";
import { callLLM } from "../services/llm.ts";

export const handleOllama = async (req: Request) => {
    console.log("--- Alfred Brain: Proxying Request ---");
    
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    try {
        // Pure proxy to the LLM service with streaming enabled if requested
        const result = await callLLM(body);
        
        if (result instanceof ReadableStream) {
            return new Response(result, { 
                headers: { ...corsHeaders, "Content-Type": "application/x-ndjson" } 
            });
        }

        return Response.json(result, { headers: corsHeaders });

    } catch (e: any) {
        console.error("System Error:", e);
        return new Response(`System Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};
