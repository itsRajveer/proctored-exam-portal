const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const monitoringController = require('../controllers/monitoringController');

// Teacher routes
router.post('/start', authenticate, checkRole('teacher'), monitoringController.startMonitoring);
router.post('/:sessionId/stop', authenticate, checkRole('teacher'), monitoringController.stopMonitoringSession);
router.get('/active', authenticate, checkRole('teacher'), monitoringController.getActiveSessions);

// Student routes
router.post('/:sessionId/peer', authenticate, checkRole('student'), monitoringController.updatePeerId);
router.post('/:sessionId/violation', authenticate, checkRole('student'), monitoringController.reportViolation);

module.exports = router; 