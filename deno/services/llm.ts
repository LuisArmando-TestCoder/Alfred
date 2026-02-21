
import { getRootPath } from "../utils.ts";

export async function callLLM(payload: any): Promise<any> {
    const bridgePath = getRootPath("bridge.py");

    const command = new Deno.Command("python3", {
        args: [bridgePath],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped"
    });

    const child = command.spawn();
    
    // Write payload to stdin
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify(payload)));
    await writer.close();

    // If streaming requested, return stdout stream immediately
    if (payload.stream) {
        return child.stdout;
    }

    // Otherwise wait for completion
    const { code, stdout, stderr } = await child.output();
    const outText = new TextDecoder().decode(stdout);

    if (code === 0 && outText.trim()) {
        try {
            // bridge.py outputs concatenated JSON objects if streaming?
            // But here stream=false, so it should be one JSON object if Ollama respects it.
            return JSON.parse(outText);
        } catch (e) {
            console.error("Failed to parse LLM response:", outText);
            throw new Error("Invalid JSON from LLM: " + outText);
        }
    } else {
        const errText = new TextDecoder().decode(stderr);
        throw new Error(`Bridge Error: ${errText}`);
    }
}
