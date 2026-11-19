const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const MAX_PLAYERS = 40;
const players = new Map();
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify({ok:true,server:1,players:players.size,capacity:MAX_PLAYERS})); }
  res.writeHead(200, {'content-type':'text/plain'}); res.end('Metro Drive 2 Server 1 is running');
});
const wss = new WebSocket.Server({server});
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function broadcast(data, except) { for (const ws of wss.clients) if (ws !== except && ws.readyState === WebSocket.OPEN) send(ws,data); }
wss.on('connection', (ws) => {
  if (players.size >= MAX_PLAYERS) { send(ws,{type:'full',server:1,capacity:MAX_PLAYERS}); return ws.close(1013,'Server full'); }
  const id = 'p' + Math.random().toString(36).slice(2,10);
  const player = {id, name:'Player', x:0, y:0, z:0, rot:0};
  players.set(ws, player);
  send(ws,{type:'welcome',id,server:1,capacity:MAX_PLAYERS,count:players.size,players:[...players.values()]});
  broadcast({type:'join',player,count:players.size},ws);
  ws.on('message',(raw)=>{
    let msg; try { msg=JSON.parse(raw.toString()); } catch { return; }
    if (msg.type==='move') {
      const p=players.get(ws); if(!p) return;
      for (const k of ['x','y','z','rot']) if (Number.isFinite(msg[k])) p[k]=msg[k];
      broadcast({type:'move',player:p},ws);
    } else if (msg.type==='chat') {
      const text=String(msg.text||'').trim().slice(0,160); if(!text) return;
      broadcast({type:'chat',id,name:String(msg.name||player.name).slice(0,24),text},null);
    } else if (msg.type==='name') {
      player.name=String(msg.name||'Player').trim().slice(0,24)||'Player';
      broadcast({type:'rename',player},ws);
    }
  });
  ws.on('close',()=>{ players.delete(ws); broadcast({type:'leave',id,count:players.size}); });
  ws.on('error',()=>{ players.delete(ws); });
});
server.listen(PORT,()=>console.log(`Metro Drive 2 Server 1 listening on ${PORT} (capacity ${MAX_PLAYERS})`));
