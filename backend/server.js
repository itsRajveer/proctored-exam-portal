const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const classRoutes = require("./src/routes/classRoutes");
const examRoutes = require('./src/routes/examRoutes');
const examSubmissionRoutes = require('./src/routes/examSubmissionRoutes');
const monitoringRoutes = require('./src/routes/monitoringRoutes');

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

// app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
