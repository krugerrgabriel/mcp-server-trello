FROM node:20-slim

WORKDIR /app

# Instala o mcp-server-trello
RUN npm install @delorenj/mcp-server-trello

# Cria o wrapper SSE
COPY bridge.mjs .

EXPOSE 8000

CMD ["node", "bridge.mjs"]
