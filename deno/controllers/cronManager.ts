import Cron from "https://deno.land/x/croner@v8.1.0/dist/croner.js";
import { commandManager } from "./commandManager.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { fromFileUrl, dirname } from "https://deno.land/std@0.224.0/path/mod.ts";

type JobInfo = {
    title: string;
    cron: string;
    command: string;
    cronInstance: any;
};

class CronManager {
    private cronFolder: string;
    private jobs: Map<string, JobInfo> = new Map();

    constructor() {
        const currentDir = dirname(fromFileUrl(import.meta.url));
        this.cronFolder = join(currentDir, "..", "data", "cron");
    }

    async initialize() {
        console.log(`Initializing Cron Manager. Watching folder: ${this.cronFolder}`);
        await this.loadAllJobs();
        this.watchFolder();
    }

    private async loadAllJobs() {
        try {
            for await (const entry of Deno.readDir(this.cronFolder)) {
                if (entry.isFile && entry.name.endsWith(".md")) {
                    await this.loadJobFile(entry.name);
                }
            }
        } catch (e) {
            console.error("Error reading cron directory:", e);
        }
    }

    private async loadJobFile(filename: string) {
        try {
            const filePath = join(this.cronFolder, filename);
            const content = await Deno.readTextFile(filePath);
            const lines = content.split("\n").map(l => l.trim()).filter(l => l !== "");
            
            if (lines.length < 3) {
                console.warn(`Cron job file ${filename} has insufficient lines.`);
                return;
            }

            const title = lines[0];
            const cronPattern = lines[1];
            const command = lines[2];

            // Stop existing job if it exists
            this.stopJob(filename);

            console.log(`Scheduling job [${title}] from ${filename}: ${cronPattern} -> ${command}`);

            const cronInstance = new Cron(cronPattern, () => {
                console.log(`Triggering cron job: ${title}`);
                commandManager.pulse(command);
            });

            this.jobs.set(filename, { title, cron: cronPattern, command, cronInstance });
        } catch (e) {
            console.error(`Error loading job file ${filename}:`, e);
        }
    }

    private stopJob(filename: string) {
        const job = this.jobs.get(filename);
        if (job) {
            job.cronInstance.stop();
            this.jobs.delete(filename);
            console.log(`Stopped job from ${filename}`);
        }
    }

    private async watchFolder() {
        const watcher = Deno.watchFs(this.cronFolder);
        let timeout: number | undefined;

        for await (const event of watcher) {
            // Debounce to avoid multiple triggers for one save
            if (timeout) clearTimeout(timeout);
            
            timeout = setTimeout(async () => {
                for (const path of event.paths) {
                    const filename = path.split("/").pop();
                    if (!filename || !filename.endsWith(".md")) continue;

                    if (event.kind === "create" || event.kind === "modify") {
                        console.log(`File ${filename} changed, reloading...`);
                        await this.loadJobFile(filename);
                    } else if (event.kind === "remove") {
                        console.log(`File ${filename} removed, stopping job...`);
                        this.stopJob(filename);
                    }
                }
            }, 100);
        }
    }
}

export const cronManager = new CronManager();
