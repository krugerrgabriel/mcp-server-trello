FROM oven/bun:latest

WORKDIR /app

RUN bun add @delorenj/mcp-server-trello supergateway

EXPOSE 8000

CMD ["bunx", "supergateway", "--stdio", "bunx @delorenj/mcp-server-trello", "--port", "8000", "--oneSessionPerClient"]
