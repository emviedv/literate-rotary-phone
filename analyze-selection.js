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

  // 3. Call 'get_metadata' for SELECTED node to see structure
  console.log("3. Getting metadata/structure for selection...");
  const callResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_metadata",
        arguments: {} // Empty args implies "current selection"
      },
      id: 2
    })
  });

  if (!callResponse.ok) {
      console.log("Call Error:", await callResponse.text());
  } else {
      const text = await callResponse.text();
      
      // Parse JSON from the SSE data line
      const match = text.match(/data: (.+)/);
      if (match) {
          try {
              const data = JSON.parse(match[1]);
              if (data.result && data.result.content) {
                  data.result.content.forEach(c => {
                      if (c.type === 'text') {
                          console.log("\n--- Layer Structure ---\n");
                          console.log(c.text);
                      }
                  });
              } else {
                  console.log("Raw Result:", match[1].substring(0, 1000));
              }
          } catch (e) {
              console.log("Could not parse JSON from data line:", e);
              console.log(text.substring(0, 1000));
          }
      } else {
          console.log("Raw Response:", text.substring(0, 1000));
      }
  }
}

run().catch(console.error);
