import http from 'http';

const ports = [44950, 44960];

async function probe(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/mcp`, (res) => {
      console.log(`Port ${port} /mcp status: ${res.statusCode}`);
      res.on('data', () => {}); // Consume data
      resolve(true);
    });
    
    req.on('error', () => {
       // Try just root
       const req2 = http.get(`http://127.0.0.1:${port}/`, (res2) => {
          console.log(`Port ${port} / status: ${res2.statusCode}`);
          res2.on('data', () => {});
          resolve(true);
       });
       req2.on('error', (err) => {
         console.log(`Port ${port} connection failed: ${err.message}`);
         resolve(false);
       });
    });
  });
}

async function main() {
    for (const port of ports) {
        await probe(port);
    }
}

main();
