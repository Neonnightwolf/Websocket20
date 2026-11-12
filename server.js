const path = require("node:path");
const http = require("node:http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });
const port = Number(process.env.PORT) || 8080;
const recentMessages = [];
const maxRecentMessages = 100;

app.use(express.static(path.join(__dirname)));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", connectedUsers: webSocketServer.clients.size });
});

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message) {
  for (const client of webSocketServer.clients) {
    send(client, message);
  }
}

webSocketServer.on("connection", (socket) => {
  for (const message of recentMessages) {
    send(socket, message);
  }

  socket.on("message", (rawMessage) => {
    let data;

    try {
      data = JSON.parse(rawMessage.toString());
    } catch {
      return;
    }

    const username = typeof data.username === "string"
      ? data.username.trim().slice(0, 24)
      : "Anonymous";
    const text = typeof data.text === "string"
      ? data.text.trim().slice(0, 500)
      : "";

    if (!text) return;

    const message = {
      username: username || "Anonymous",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    };

    recentMessages.push(message);
    if (recentMessages.length > maxRecentMessages) {
      recentMessages.shift();
    }

    broadcast(message);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`WebSocket chat listening on port ${port}`);
});
