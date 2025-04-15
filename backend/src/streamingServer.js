const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5002;

// Enable CORS with specific options
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
  credentials: true
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store active streams and their metadata
const activeStreams = new Map();
const streamMetadata = new Map();

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const sessionDir = path.join(uploadsDir, sessionId);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}.webm`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Handle preflight requests
app.options('*', cors());

// Get active monitoring sessions
app.get('/api/monitoring/sessions', (req, res) => {
  try {
    const sessions = Array.from(activeStreams.entries()).map(([sessionId, streamPath]) => {
      const stat = fs.statSync(streamPath);
      const lastModified = stat.mtime;
      const isActive = Date.now() - lastModified.getTime() < 10000;

      return {
        id: sessionId,
        status: isActive ? 'active' : 'inactive',
        lastUpdate: lastModified.toISOString(),
        studentId: sessionId,
        studentName: `Student ${sessionId.slice(-4)}`,
        violations: []
      };
    }).filter(session => session.status === 'active');

    res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
});

// Handle video stream upload
app.post('/api/monitoring/:sessionId/stream', upload.single('video'), (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    const filePath = req.file.path;
    console.log('Received video chunk for session:', sessionId);
    
    // Update stream metadata
    if (!streamMetadata.has(sessionId)) {
      streamMetadata.set(sessionId, {
        chunks: [],
        lastUpdate: Date.now()
      });
    }
    
    const metadata = streamMetadata.get(sessionId);
    metadata.chunks.push(filePath);
    metadata.lastUpdate = Date.now();
    
    // Keep only the last 30 seconds of chunks
    const thirtySecondsAgo = Date.now() - 30000;
    metadata.chunks = metadata.chunks.filter(chunkPath => {
      const stat = fs.statSync(chunkPath);
      return stat.mtimeMs > thirtySecondsAgo;
    });
    
    // Update the active stream path to the latest chunk
    activeStreams.set(sessionId, filePath);
    
    res.status(200).json({ 
      success: true,
      message: 'Stream chunk received successfully'
    });
  } catch (error) {
    console.error('Error handling stream upload:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process stream chunk'
    });
  }
});

// Get stream URL for a session
app.get('/api/monitoring/:sessionId/stream', (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    console.log('Getting stream for session:', sessionId);
    const streamPath = activeStreams.get(sessionId);
    
    if (!streamPath || !fs.existsSync(streamPath)) {
      console.log('No active stream found for session:', sessionId);
      return res.status(404).json({ 
        success: false,
        error: 'No active stream found for this session'
      });
    }
    
    const streamUrl = `/stream/${sessionId}/latest`;
    console.log('Stream URL:', streamUrl);
    
    res.status(200).json({ 
      success: true,
      streamUrl
    });
  } catch (error) {
    console.error('Error getting stream URL:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get stream URL'
    });
  }
});

// Serve the latest stream file (concatenate all recent chunks)
app.get('/stream/:sessionId/latest', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const metadata = streamMetadata.get(sessionId);

    if (!metadata || metadata.chunks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active stream found'
      });
    }

    // Set headers for video streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');

    // Helper to stream all chunks in order
    const streamChunks = async (chunks, res) => {
      for (const chunkPath of chunks) {
        await new Promise((resolve, reject) => {
          const stream = fs.createReadStream(chunkPath);
          stream.on('end', resolve);
          stream.on('error', reject);
          stream.pipe(res, { end: false });
        });
      }
      res.end();
    };

    await streamChunks(metadata.chunks, res);
  } catch (error) {
    console.error('Error serving concatenated stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to serve stream'
      });
    }
  }
});

// Cleanup old streams periodically
const cleanupInterval = setInterval(() => {
  try {
    console.log('Running cleanup...');
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000); // Keep only last minute of data
    
    // Clean up old metadata and chunks
    for (const [sessionId, metadata] of streamMetadata.entries()) {
      if (metadata.lastUpdate < oneMinuteAgo) {
        // Remove old chunks
        metadata.chunks.forEach(chunkPath => {
          try {
            fs.unlinkSync(chunkPath);
          } catch (err) {
            console.error('Error deleting chunk:', err);
          }
        });
        
        // Remove session metadata
        streamMetadata.delete(sessionId);
        activeStreams.delete(sessionId);
      }
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}, 60 * 1000); // Run every minute

// Start the server
app.listen(port, () => {
  console.log(`Streaming server running on port ${port}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

// Handle cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  clearInterval(cleanupInterval);
  process.exit(0);
}); 