import { corsHeaders } from "../utils.ts";

export const handlePaint = (color: string) => {
    const hexMap: Record<string, string> = {
        blue: '#1f6096',
        yellow: '#eece59',
        pink: '#e33584',
        black: '#000'
    };
    const hex = hexMap[color];
    if (hex) {
        return Response.json({ action: "paint", color: hex, message: `Painted ${color}` }, { headers: corsHeaders });
    }
    return new Response("Color not found", { status: 404, headers: corsHeaders });
};
