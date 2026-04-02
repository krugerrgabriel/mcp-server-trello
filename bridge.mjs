import http from "node:http";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const PORT = process.env.PORT || 8000;
const sessions = new Map();

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // SSE endpoint
  if (req.method === "GET" && req.url === "/sse") {
    const sessionId = crypto.randomUUID();

    // Spawn novo processo filho para cada conexão
    const child = spawn("npx", ["@delorenj/mcp-server-trello"], {
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ["pipe", "pipe", "inherit"],
    });

    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop(); // guarda linha incompleta
      for (const line of lines) {
        if (line.trim()) {
          res.write(`event: message\ndata: ${line.trim()}\n\n`);
        }
      }
    });

    child.on("close", () => {
      sessions.delete(sessionId);
      res.end();
    });

    sessions.set(sessionId, { child, res });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Envia o endpoint de mensagens para o cliente
    const baseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
    res.write(`event: endpoint\ndata: ${baseUrl}/message?sessionId=${sessionId}\n\n`);

    req.on("close", () => {
      child.kill();
      sessions.delete(sessionId);
    });

    return;
  }

  // POST message endpoint
  if (req.method === "POST" && req.url?.startsWith("/message")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const session = sessions.get(sessionId);

    if (!session) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      session.child.stdin.write(body + "\n");
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`MCP SSE Bridge listening on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
