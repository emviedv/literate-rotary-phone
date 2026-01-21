import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { EventSource } from "eventsource";

global.EventSource = EventSource;

async function connectToFigmaDesktop() {
  console.log("Attempting to connect to Figma Desktop MCP...");
  
  // Try the documented local endpoint
  const url = "http://127.0.0.1:3845/mcp";

  try {
    const transport = new SSEClientTransport(new URL(url));
    
    // Create MCP Client
    const client = new Client(
      { name: "Gemini CLI", version: "1.0.0" },
      { capabilities: {} }
    );

    console.log("Connecting...");
    await client.connect(transport);
    console.log("Connected!");

    // List tools to see if we can get selection
    console.log("Listing tools...");
    const tools = await client.listTools();
    tools.tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));

    // Try to get resources (selection might be here)
    console.log("\nListing resources...");
    const resources = await client.listResources();
    resources.resources.forEach(r => console.log(`- ${r.name} (${r.uri})`));
    
    await client.close();

  } catch (err) {
    console.error("Connection failed:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
  }
}

connectToFigmaDesktop();
