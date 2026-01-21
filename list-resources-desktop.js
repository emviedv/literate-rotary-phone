// fetch is global in Node 22+

async function run() {
  const endpoint = "http://127.0.0.1:3845/mcp";
  let sessionId = "";

  console.log("1. Initializing...");
  
  const initResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "Gemini CLI", version: "1.0.0" }
      },
      id: 1
    })
  });

  if (!initResponse.ok) {
    console.error("Init failed:", initResponse.status, await initResponse.text());
    return;
  }

  sessionId = initResponse.headers.get("mcp-session-id");
  console.log("Session ID:", sessionId);

  // 2. Send 'notifications/initialized'
  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    })
  });

  // 3. List Resources
  console.log("3. Listing resources...");
  const resourcesResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "resources/list",
      id: 2
    })
  });

  if (!resourcesResponse.ok) {
      console.log("Resources Error:", await resourcesResponse.text());
  } else {
      console.log("Resources Body:", await resourcesResponse.text());
  }
}

run().catch(console.error);
