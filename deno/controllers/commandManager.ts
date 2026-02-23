import { corsHeaders } from "../utils.ts";

export type PulsedCommand = {
    command: string;
    args: (string | number)[];
};

type Client = {
    id: string;
    controller: ReadableStreamDefaultController;
};

class CommandManager {
    private clients: Set<Client> = new Set();

    addClient(id: string, controller: ReadableStreamDefaultController) {
        const client = { id, controller };
        this.clients.add(client);
        return client;
    }

    removeClient(client: Client) {
        this.clients.delete(client);
    }

    parseCommand(raw: string): PulsedCommand {
        // Regex to match words or quoted strings
        // Example: play_music("nice", 1) or paint("blue")
        const match = raw.match(/^(\w+)\((.*)\)$/);
        
        if (match) {
            const command = match[1];
            const argsString = match[2];
            const args = argsString.split(',')
                .map(arg => arg.trim())
                .filter(arg => arg.length > 0)
                .map(arg => {
                    // Remove quotes if present
                    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                        return arg.slice(1, -1);
                    }
                    // Try to convert to number
                    if (!isNaN(Number(arg)) && arg !== "") {
                        return Number(arg);
                    }
                    return arg;
                });
            return { command, args };
        }

        // Fallback to space-separated if no parentheses
        const parts = raw.split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1).map(arg => {
            if (!isNaN(Number(arg)) && arg !== "") {
                return Number(arg);
            }
            return arg;
        });

        return { command, args };
    }

    pulse(rawCommand: string) {
        console.log(`[deno/controllers/commandManager.ts] pulse() triggering: ${rawCommand}`);
        const parsed = this.parseCommand(rawCommand);
        const data = JSON.stringify(parsed);
        console.log(`[deno/controllers/commandManager.ts] Broadcasters data: ${data}`);
        
        const encoder = new TextEncoder();
        for (const client of this.clients) {
            try {
                client.controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } catch (e) {
                console.error(`Error pulsing to client ${client.id}:`, e);
                this.removeClient(client);
            }
        }
    }

    getAvailableCommands(search?: string) {
        const allCommands = [
            "play_music(mood)",
            "open_link(site)",
            "paint(color)",
            "get_time()",
            "get_info(topic)"
        ];

        if (!search) return allCommands;

        const keywords = search.split(',')
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

        if (keywords.length === 0) return allCommands;

        return allCommands.filter(cmd => {
            const normalizedCmd = cmd.toLowerCase();
            return keywords.some(kw => normalizedCmd.includes(kw));
        });
    }

    handleSSE(req: Request) {
        console.log("[deno/controllers/commandManager.ts] handleSSE() new client connecting.");
        const id = crypto.randomUUID();
        let heartbeatInterval: number | undefined;

        const body = new ReadableStream({
            start: (controller) => {
                console.log(`[deno/controllers/commandManager.ts] SSE stream started for client: ${id}`);
                const client = this.addClient(id, controller);
                
                // Keep-alive heartbeat every 30 seconds
                heartbeatInterval = setInterval(() => {
                    try {
                        controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
                    } catch (e) {
                        console.error(`Error sending heartbeat to client ${id}:`, e);
                        if (heartbeatInterval) clearInterval(heartbeatInterval);
                        this.removeClient(client);
                    }
                }, 30000);

                req.signal.addEventListener("abort", () => {
                    if (heartbeatInterval) clearInterval(heartbeatInterval);
                    this.removeClient(client);
                });
            },
            cancel: () => {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
            }
        });

        return new Response(body, {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    }
}

export const commandManager = new CommandManager();
