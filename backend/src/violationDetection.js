const { db } = require('./config/firebase');

class ViolationDetection {
  constructor() {
    this.violationTypes = {
      MULTIPLE_FACES: 'multiple_faces',
      NO_FACE: 'no_face',
      LOOKING_AWAY: 'looking_away',
      PHONE_DETECTED: 'phone_detected',
      PERSON_DETECTED: 'person_detected',
      TAB_CHANGE: 'tab_change'
    };
  }

  async detectViolation(sessionId, violationType, timestamp) {
    try {
      const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
      const sessionSnapshot = await sessionRef.once('value');
      const session = sessionSnapshot.val();

      if (!session) {
        throw new Error('Session not found');
      }

      // Update violation count
      const violationsRef = sessionRef.child('violations');
      const violationsSnapshot = await violationsRef.once('value');
      const violations = violationsSnapshot.val() || {};

      if (!violations[violationType]) {
        violations[violationType] = 0;
      }
      violations[violationType]++;

      // Update session with new violation
      await sessionRef.update({
        violations,
        lastViolation: {
          type: violationType,
          timestamp
        }
      });

      return {
        success: true,
        violationType,
        count: violations[violationType]
      };
    } catch (error) {
      console.error('Error detecting violation:', error);
      throw error;
    }
  }

  async getViolationStats(sessionId) {
    try {
      const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
      const sessionSnapshot = await sessionRef.once('value');
      const session = sessionSnapshot.val();

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        totalViolations: Object.values(session.violations || {}).reduce((a, b) => a + b, 0),
        violationsByType: session.violations || {},
        lastViolation: session.lastViolation || null
      };
    } catch (error) {
      console.error('Error getting violation stats:', error);
      throw error;
    }
  }
}

module.exports = new ViolationDetection(); 