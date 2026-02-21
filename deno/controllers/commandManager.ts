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
        const parsed = this.parseCommand(rawCommand);
        const data = JSON.stringify(parsed);
        console.log(`Pulsing command: ${data}`);
        
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

    handleSSE(req: Request) {
        const id = crypto.randomUUID();
        const body = new ReadableStream({
            start: (controller) => {
                const client = this.addClient(id, controller);
                req.signal.addEventListener("abort", () => {
                    this.removeClient(client);
                });
            },
            cancel: () => {
                // Handled by abort listener
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
