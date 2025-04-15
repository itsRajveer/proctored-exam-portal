const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const violationDetection = require('../violationDetection');

// Report a violation
router.post('/:sessionId/report', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { violationType, timestamp } = req.body;

    if (!violationType || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await violationDetection.detectViolation(
      sessionId,
      violationType,
      timestamp
    );

    res.json(result);
  } catch (error) {
    console.error('Error reporting violation:', error);
    res.status(500).json({ error: 'Failed to report violation' });
  }
});

// Get violation statistics for a session
router.get('/:sessionId/stats', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await violationDetection.getViolationStats(sessionId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting violation stats:', error);
    res.status(500).json({ error: 'Failed to get violation statistics' });
  }
});

module.exports = router; 