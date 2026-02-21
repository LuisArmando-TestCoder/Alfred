import { corsHeaders } from "./utils.ts";
import { handleMusic } from "./controllers/music.ts";
import { handleLink } from "./controllers/links.ts";
import { handleInfo } from "./controllers/info.ts";
import { handlePaint } from "./controllers/paint.ts";
import { handleOllama } from "./controllers/ollama.ts";
import { handleContext, handleContextRaw, handleHistory } from "./controllers/context.ts";
import { handleEvolutionApply } from "./controllers/evolution.ts";

Deno.serve({ port: 8000 }, async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith("/music/")) {
        return handleMusic(path.split("/")[2]);
    }

    if (path.startsWith("/link/")) {
        return handleLink(path.split("/")[2]);
    }

    if (path.startsWith("/info/")) {
        return handleInfo(path.split("/")[2]);
    }

    if (path.startsWith("/paint/")) {
        return handlePaint(path.split("/")[2]);
    }

    if (path === "/api/ask" && req.method === "POST") {
        return await handleOllama(req);
    }

    if (path === "/api/context" && req.method === "POST") {
        return await handleContext(req);
    }

    if (path === "/api/context/raw") {
        return await handleContextRaw(req);
    }

    if (path === "/api/history" && req.method === "GET") {
        return await handleHistory(req);
    }

    if (path === "/api/evolve" && req.method === "POST") {
        return await handleEvolutionApply(req);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
});
