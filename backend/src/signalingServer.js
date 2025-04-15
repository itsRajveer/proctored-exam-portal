const WebSocket = require('ws');
const { db } = require('./config/firebase');
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Handle WebSocket upgrade
  if (req.url.startsWith('/ws')) {
    // The WebSocket server will handle the upgrade
    res.writeHead(426, { 
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Version': '13'
    });
    res.end('WebSocket connection required');
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws',
  clientTracking: true,
  perMessageDeflate: false
});

// Store active connections
const connections = new Map();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  const url = new URL(req.url, 'http://localhost:5001');
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    console.log('No sessionId provided, closing connection');
    ws.close(1008, 'No sessionId provided');
    return;
  }

  // Store the connection
  connections.set(sessionId, ws);
  console.log(`Connection stored for session: ${sessionId}`);

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message type: ${data.type} from session: ${sessionId}`);
      
      switch (data.type) {
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Forward the message to the other peer
          const targetSessionId = data.targetSessionId;
          const targetWs = connections.get(targetSessionId);
          
          if (targetWs) {
            console.log(`Forwarding ${data.type} to session: ${targetSessionId}`);
            targetWs.send(JSON.stringify({
              type: data.type,
              [data.type]: data[data.type],
              senderSessionId: sessionId
            }));
          } else {
            console.log(`Target session ${targetSessionId} not found`);
            ws.send(JSON.stringify({
              type: 'error',
              error: `Target session ${targetSessionId} not found`
            }));
          }
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ 
        type: 'error',
        error: 'Invalid message format' 
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`Connection closed for session: ${sessionId}`);
    connections.delete(sessionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for session ${sessionId}:`, error);
    connections.delete(sessionId);
  });

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: sessionId
  }));
});

// Get signaling information for a session
async function getSignalingInfo(sessionId) {
  try {
    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      peerId: session.peerId,
      teacherId: session.teacherId
    };
  } catch (error) {
    console.error('Error getting signaling info:', error);
    throw error;
  }
}

module.exports = { server, getSignalingInfo }; 