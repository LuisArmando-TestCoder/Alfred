import { alfredRemembers } from "../data/alfredData.ts";
import { corsHeaders } from "../utils.ts";

export const handleInfo = (topic: string) => {
    if (topic === "life") {
         return Response.json({ action: "speak", message: "42" }, { headers: corsHeaders });
    }
    if (topic === "definition") {
         return Response.json({ action: "speak", message: "A definition is a statement of the exact meaning of a word, especially in a dictionary." }, { headers: corsHeaders });
    }
    if (topic === "creator") {
         return Response.json({ action: "speak", message: `Creator is ${alfredRemembers.creatorsName}` }, { headers: corsHeaders });
    }
    if (topic === "identity") {
         return Response.json({ action: "speak", message: "I am Alfred" }, { headers: corsHeaders });
    }
    if (topic === "time") {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        return Response.json({ action: "speak", message: `The current time is ${timeStr}` }, { headers: corsHeaders });
    }
    if (topic === "environment") {
        const os = Deno.build.os;
        const arch = Deno.build.arch;
        const denoVer = Deno.version.deno;
        return Response.json({ 
            action: "speak", 
            message: `I am running on ${os} ${arch}, powered by Deno version ${denoVer}.` 
        }, { headers: corsHeaders });
    }
    return new Response("Info topic not found", { status: 404, headers: corsHeaders });
};
