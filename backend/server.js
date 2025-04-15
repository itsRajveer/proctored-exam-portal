const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const classRoutes = require("./src/routes/classRoutes");
const examRoutes = require('./src/routes/examRoutes');
const examSubmissionRoutes = require('./src/routes/examSubmissionRoutes');
const monitoringRoutes = require('./src/routes/monitoringRoutes');
const violationRoutes = require('./src/routes/violationRoutes');
const signalingServer = require('./src/signalingServer');

// const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/classes", classRoutes);
app.use('/exams', examRoutes);
app.use('/api/exam-submissions', examSubmissionRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/violations', violationRoutes); 

// app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const SIGNALING_PORT = process.env.SIGNALING_PORT || 5001;

// Start main server
app.listen(PORT, () => console.log(`Main server running on port ${PORT}`));

// Start signaling server
signalingServer.server.listen(SIGNALING_PORT, () => {
  console.log(`Signaling server running on port ${SIGNALING_PORT}`);
});
