const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const monitoringController = require('../controllers/monitoringController');

// Student routes
router.post('/:examId/start', authenticate, checkRole('student'), monitoringController.startMonitoringSession);
router.put('/:sessionId/update', authenticate, checkRole('student'), monitoringController.updateMonitoringSession);
router.post('/:sessionId/end', authenticate, checkRole('student'), monitoringController.endMonitoringSession);

// Teacher routes
router.get('/active', authenticate, checkRole('teacher'), monitoringController.getActiveSessions);

module.exports = router; 