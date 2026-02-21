import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { getDataPath } from "../utils.ts";

const MEMORY_DIR = getDataPath("memories");

export async function saveMarkdownMemory(filename: string, content: string): Promise<void> {
    const filePath = join(MEMORY_DIR, `${filename}.md`);
    await Deno.writeTextFile(filePath, content);
}

export async function appendMarkdownMemory(filename: string, content: string): Promise<void> {
    const filePath = join(MEMORY_DIR, `${filename}.md`);
    try {
        const existing = await Deno.readTextFile(filePath);
        await Deno.writeTextFile(filePath, existing + "\n" + content);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            await Deno.writeTextFile(filePath, content);
        } else {
            throw error;
        }
    }
}

export async function getMarkdownMemory(filename: string): Promise<string> {
    const filePath = join(MEMORY_DIR, `${filename}.md`);
    try {
        return await Deno.readTextFile(filePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return "";
        }
        throw error;
    }
}

export async function listMarkdownMemories(): Promise<string[]> {
    const files: string[] = [];
    try {
        for await (const entry of Deno.readDir(MEMORY_DIR)) {
            if (entry.isFile && entry.name.endsWith(".md")) {
                files.push(entry.name.replace(".md", ""));
            }
        }
    } catch (error) {
        // Directory might not exist yet
        console.error("Error listing memories:", error);
    }
    return files;
}
