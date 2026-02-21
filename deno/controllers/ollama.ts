import { corsHeaders } from "../utils.ts";

export const handleOllama = async (req: Request) => {
    console.log("--- Alfred Brain: Using Python Bridge ---");
    
    let body;
    try {
        body = await req.json();
        body.stream = false;
    } catch (e) {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    try {
        const command = new Deno.Command("python3", {
            args: ["bridge.py"],
            stdin: "piped",
        });

        const child = command.spawn();
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode(JSON.stringify(body)));
        await writer.close();

        const { code, stdout, stderr } = await child.output();
        const outText = new TextDecoder().decode(stdout);

        if (code === 0 && outText.trim()) {
            console.log("✅ Alfred is thinking (Via Python Bridge)");
            return Response.json(JSON.parse(outText), { headers: corsHeaders });
        } else {
            const errText = new TextDecoder().decode(stderr);
            console.error("❌ Python Bridge Error:", errText); // THIS WILL SHOW THE REAL PROBLEM
            return new Response(`Bridge Error: ${errText}`, { status: 500, headers: corsHeaders });
        }
    } catch (e: any) {
        return new Response(`System Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
};