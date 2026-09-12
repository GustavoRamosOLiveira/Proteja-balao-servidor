const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const rooms = new Map();

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += chars[crypto.randomInt(chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(room, message, except = null) {
  for (const player of room.players) {
    if (player !== except) send(player.ws, message);
  }
}

function removePlayer(ws) {
  for (const [code, room] of rooms) {
    const index = room.players.findIndex(p => p.ws === ws);
    if (index === -1) continue;

    const [player] = room.players.splice(index, 1);
    broadcast(room, { type: "player_left", player: player.id });

    if (room.players.length === 0) {
      rooms.delete(code);
    }
    return;
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({
    jogo: "Proteja o Balão",
    status: "online",
    salas: rooms.size
  }));
});

const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  const playerId = crypto.randomUUID();
  ws._playerId = playerId;

  send(ws, {
    type: "connected",
    player: playerId
  });

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Mensagem inválida." });
      return;
    }

    if (msg.type === "create_room") {
      removePlayer(ws);

      const code = makeCode();
      const room = {
        code,
        players: [{ id: playerId, ws, number: 1 }]
      };
      rooms.set(code, room);

      send(ws, {
        type: "room_created",
        code,
        player: 1
      });
      return;
    }

    if (msg.type === "join_room") {
      const code = String(msg.code || "").trim().toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        send(ws, { type: "error", message: "Sala não encontrada." });
        return;
      }

      if (room.players.length >= 2) {
        send(ws, { type: "error", message: "Essa sala já está cheia." });
        return;
      }

      removePlayer(ws);

      room.players.push({ id: playerId, ws, number: 2 });

      send(ws, {
        type: "room_joined",
        code,
        player: 2
      });

      broadcast(room, {
        type: "player_joined",
        player: 2
      }, ws);

      if (room.players.length === 2) {
        broadcast(room, {
          type: "room_ready",
          code
        });
      }
      return;
    }

    // Relay de informações da partida.
    // O jogo poderá enviar inputs/estado por aqui sem o servidor
    // precisar conhecer as regras do jogo.
    if (msg.type === "game") {
      const room = [...rooms.values()].find(r =>
        r.players.some(p => p.ws === ws)
      );

      if (!room) {
        send(ws, { type: "error", message: "Você não está em uma sala." });
        return;
      }

      broadcast(room, {
        type: "game",
        from: playerId,
        data: msg.data
      }, ws);
      return;
    }

    if (msg.type === "leave_room") {
      removePlayer(ws);
      return;
    }

    send(ws, { type: "error", message: "Tipo de mensagem desconhecido." });
  });

  ws.on("close", () => removePlayer(ws));
});

server.listen(PORT, () => {
  console.log(`Proteja o Balão online na porta ${PORT}`);
});
