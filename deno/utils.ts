/**
 * Generates a random integer between min and max (inclusive).
 * Useful for your randomized response logic.
 */
export const r = (min: number, max: number): number => 
    Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Essential headers for Cross-Origin Resource Sharing (CORS).
 * Without these, your Next.js app (localhost:3000) cannot 
 * communicate with your Deno server (localhost:8000).
 */
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allows any origin to access the API
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};