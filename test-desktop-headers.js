import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { EventSource } from "eventsource";

// Custom EventSource to add headers
class CustomEventSource extends EventSource {
    constructor(url, options) {
        super(url, {
            ...options,
            headers: {
                ...options?.headers,
                "Origin": "http://localhost",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
    }
}
global.EventSource = CustomEventSource;

async function connectToFigmaDesktop() {
  console.log("Attempting to connect to Figma Desktop MCP with custom headers...");
  
  const url = "http://127.0.0.1:3845/mcp";

  try {
    const transport = new SSEClientTransport(new URL(url));
    
    const client = new Client(
      { name: "Gemini CLI", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    console.log("Connected!");

    const tools = await client.listTools();
    console.log("Tools:", tools.tools.map(t => t.name).join(", "));
    
    await client.close();

  } catch (err) {
    console.error("Connection failed:", err.message);
  }
}

connectToFigmaDesktop();
