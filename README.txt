# Servidor online — Proteja o Balão

Este servidor cria salas de 2 jogadores usando WebSocket.

## Arquivos

- `server.js` — servidor
- `package.json` — configuração do Node.js

## Render

Tipo: **Web Service**

Build Command:
`npm install`

Start Command:
`npm start`

Depois de publicado, o Render fornecerá um endereço `https://SEU-SERVICO.onrender.com`.

Para WebSocket, o endereço usado pelo jogo será:

`wss://SEU-SERVICO.onrender.com`

O HTML do jogo ainda precisa ser ligado a esse endereço. O servidor sozinho não altera o jogo.
