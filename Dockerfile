FROM oven/bun:latest

WORKDIR /app

# Instala o mcp-server-trello e o supergateway (bridge stdio→SSE)
RUN bun add @delorenj/mcp-server-trello supergateway

EXPOSE 8000

# supergateway faz o bridge: roda o MCP via stdio e expõe como SSE
CMD ["bunx", "supergateway", "--stdio", "bunx @delorenj/mcp-server-trello", "--port", "8000"]
