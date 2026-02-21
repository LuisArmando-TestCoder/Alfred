
import { getDataPath } from "../utils.ts";

const GRAPH_FILE = getDataPath("knowledge_graph.json");

export interface GraphNode {
    id: string;
    type: string;
    content: string;
    timestamp: number;
    [key: string]: any;
}

export interface GraphEdge {
    source: string;
    target: string;
    relation: string;
    weight: number;
}

export interface KnowledgeGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

let graph: KnowledgeGraph = { nodes: [], edges: [] };
let loaded = false;

async function loadGraph() {
    if (loaded) return;
    try {
        const data = await Deno.readTextFile(GRAPH_FILE);
        graph = JSON.parse(data);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            graph = { nodes: [], edges: [] };
            await saveGraph(); // Create empty file
        } else {
            console.error("Error loading graph:", error);
        }
    }
    loaded = true;
}

async function saveGraph() {
    await Deno.writeTextFile(GRAPH_FILE, JSON.stringify(graph, null, 2));
}

export async function addNode(node: Omit<GraphNode, "timestamp">): Promise<void> {
    await loadGraph();
    const existing = graph.nodes.find(n => n.id === node.id);
    if (!existing) {
        // Explicitly construct to satisfy TS
        const newNode = { ...node, timestamp: Date.now() } as GraphNode;
        graph.nodes.push(newNode);
        await saveGraph();
    }
}

export async function addEdge(edge: GraphEdge): Promise<void> {
    await loadGraph();
    // Check for existing edge
    const existing = graph.edges.find(e => 
        e.source === edge.source && 
        e.target === edge.target && 
        e.relation === edge.relation
    );
    
    if (!existing) {
        graph.edges.push(edge);
        await saveGraph();
    } else {
        // Update weight?
        existing.weight = (existing.weight + edge.weight) / 2; // Average or increment?
        await saveGraph();
    }
}

export async function findRelated(nodeId: string, maxDepth: number = 1): Promise<GraphNode[]> {
    await loadGraph();
    const relatedNodes = new Set<string>();
    const queue: { id: string, depth: number }[] = [{ id: nodeId, depth: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth >= maxDepth) continue;
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        // Find outgoing edges
        const outgoing = graph.edges.filter(e => e.source === current.id);
        for (const edge of outgoing) {
            relatedNodes.add(edge.target);
            queue.push({ id: edge.target, depth: current.depth + 1 });
        }

        // Find incoming edges (optional, depending on traversal needs)
        const incoming = graph.edges.filter(e => e.target === current.id);
        for (const edge of incoming) {
            relatedNodes.add(edge.source);
            queue.push({ id: edge.source, depth: current.depth + 1 });
        }
    }

    return graph.nodes.filter(n => relatedNodes.has(n.id) && n.id !== nodeId);
}

export async function getGraphContext(concept: string): Promise<string> {
    await loadGraph();
    // Simple keyword search for now if ID not known
    const node = graph.nodes.find(n => n.id.toLowerCase() === concept.toLowerCase() || n.content.toLowerCase().includes(concept.toLowerCase()));
    
    if (!node) return "";
    
    const related = await findRelated(node.id, 1);
    const relatedContext = related.map(n => `- ${n.content} (Relation to ${node.id})`).join("\n");
    
    return `Knowledge Graph Context for "${concept}":\n${node.content}\nRelated:\n${relatedContext}`;
}

export async function getAllNodes(): Promise<GraphNode[]> {
    await loadGraph();
    return graph.nodes;
}
