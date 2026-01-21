import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { EventSource } from "eventsource";

// Polyfill EventSource for Node.js environment
global.EventSource = EventSource;

async function main() {
  const transport = new SSEClientTransport(
    new URL("http://127.0.0.1:3333/sse")
  );

  console.log("Connecting to Figma Context MCP on port 3333...");

  try {
    const client = new Client(
      {
        name: "Gemini CLI",
        version: "1.0.0",
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    await client.connect(transport);
    console.log("Connected successfully!");

    // List available tools to see what we can do
    console.log("\nListing available tools...");
    const tools = await client.listTools();
    
    if (tools.tools && tools.tools.length > 0) {
      tools.tools.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
      });
    } else {
      console.log("No tools found. Make sure a Figma file is open.");
    }

    // List available resources (open files/selection)
    console.log("\nListing available resources...");
    const resources = await client.listResources();
    if (resources.resources && resources.resources.length > 0) {
        resources.resources.forEach(resource => {
            console.log(`- ${resource.name} (${resource.uri})`);
        });
    } else {
        console.log("No resources found. Make sure a file is open.");
    }


    await client.close();

  } catch (error) {
    console.error("Failed to connect or interact:", error);
  }
}

main();
