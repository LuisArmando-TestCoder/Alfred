import { corsHeaders } from "./utils.ts";
import { handleMusic } from "./controllers/music.ts";
import { handleLink } from "./controllers/links.ts";
import { handleInfo } from "./controllers/info.ts";
import { handlePaint } from "./controllers/paint.ts";
import { handleContextRaw } from "./controllers/context.ts";
import { commandManager } from "./controllers/commandManager.ts";
import { cronManager } from "./controllers/cronManager.ts";

// Initialize Cron Manager
cronManager.initialize();

Deno.serve({ port: 8000 }, async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith("/music/")) {
        return handleMusic(path.split("/")[2]);
    } else if (path.startsWith("/link/")) {
        return handleLink(path.split("/")[2]);
    } else if (path.startsWith("/info/")) {
        return handleInfo(path.split("/")[2]);
    } else if (path.startsWith("/paint/")) {
        return handlePaint(path.split("/")[2]);
    } else if (path === "/api/context/raw") {
        return await handleContextRaw(req);
    } else if (path === "/api/readme" || path === "/api/readme/") {
        try {
            const content = await Deno.readTextFile("../README.md");
            return new Response(JSON.stringify({ content }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Error reading README.md:", e);
            return new Response(JSON.stringify({ content: "" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    } else if (path === "/api/events") {
        return commandManager.handleSSE(req);
    } else if (path === "/api/commands" || path === "/api/commands/") {
        if (req.method === "GET") {
            const list = commandManager.getAvailableCommands();
            return new Response(JSON.stringify({ commands: list }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } else if (req.method === "POST") {
            try {
                const body = await req.json();
                const { pulse } = body;
                if (pulse) {
                    commandManager.pulse(pulse);
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ error: "Missing pulse command" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
});
