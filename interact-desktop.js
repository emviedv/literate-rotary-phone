// fetch is global in Node 22+


async function run() {
  const endpoint = "http://127.0.0.1:3845/mcp";
  let sessionId = "";

  console.log("1. Initializing...");
  
  // Start the SSE stream / Initialize
  // In MCP HTTP transport, we POST to start the session and get an SSE stream back.
  const initController = new AbortController();
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
    }),
    signal: initController.signal
  });

  if (!initResponse.ok) {
    console.error("Init failed:", initResponse.status, await initResponse.text());
    return;
  }

  sessionId = initResponse.headers.get("mcp-session-id");
  console.log("Session ID:", sessionId);

  if (!sessionId) {
    console.error("No session ID returned!");
    return;
  }

  // We need to keep reading the body to keep the connection alive, 
  // but for this test we just want to send the next request.
  // We'll read the first chunk to see the initialize result.
  const reader = initResponse.body.getReader();
  const decoder = new TextDecoder();
  
  // Read first chunk (initialize response)
  const { value } = await reader.read();
  console.log("Init Response:", decoder.decode(value));

  // 2. Send 'notifications/initialized'
  console.log("2. Sending initialized notification...");
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

  // 3. List Tools
  console.log("3. Listing tools...");
  const toolsResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "mcp-session-id": sessionId
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 2
    })
  });

  console.log("Tools POST status:", toolsResponse.status);
  if (!toolsResponse.ok) {
      console.log("Tools POST error body:", await toolsResponse.text());
  } else {
      console.log("Tools POST response body:", await toolsResponse.text());
  }

  // Read loop for a few seconds to catch the tools response
  const startTime = Date.now();
  while (Date.now() - startTime < 3000) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    console.log("Stream Data:", text);
    if (text.includes("tools/list") || text.includes("result")) {
        // We found it!
        break;
    }
  }

  // 4. If we found a tool like 'get_selection' or 'get_file', let's try to use it.
  // For now, just listing is enough proof.
  
  initController.abort();
}

run().catch(console.error);
