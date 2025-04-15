const { db } = require('../config/firebase');

// Start a monitoring session when student begins exam
const startMonitoringSession = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.uid;
    const { streamUrl, peerId } = req.body;

    // Verify exam exists and is active
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const exam = examSnapshot.val();

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (now < startTime || now > endTime) {
      return res.status(400).json({ error: 'Exam is not currently active' });
    }

    // Create or update monitoring session
    const sessionRef = db.ref('monitoringSessions').push();
    const sessionData = {
      id: sessionRef.key,
      examId,
      studentId,
      streamUrl,
      peerId,
      status: 'active',
      violations: 0,
      lastViolation: null,
      startedAt: new Date().toISOString(),
      teacherId: exam.teacherId
    };

    await sessionRef.set(sessionData);

    res.status(201).json(sessionData);
  } catch (error) {
    console.error('Error starting monitoring session:', error);
    res.status(500).json({ error: 'Failed to start monitoring session' });
  }
};

// Update monitoring session with violations
const updateMonitoringSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { violations, status } = req.body;

    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      return res.status(404).json({ error: 'Monitoring session not found' });
    }

    const updates = {
      violations: session.violations + (violations || 0),
      lastViolation: new Date().toISOString(),
      status: status || session.status
    };

    await sessionRef.update(updates);

    res.status(200).json({ ...session, ...updates });
  } catch (error) {
    console.error('Error updating monitoring session:', error);
    res.status(500).json({ error: 'Failed to update monitoring session' });
  }
};

// Get active monitoring sessions for a teacher
const getActiveSessions = async (req, res) => {
  try {
    const teacherId = req.user.uid;

    // Get all active sessions for this teacher
    const sessionsSnapshot = await db.ref('monitoringSessions')
      .orderByChild('teacherId')
      .equalTo(teacherId)
      .once('value');

    const sessions = sessionsSnapshot.val() || {};
    const activeSessions = [];

    // Get current time to check if exam is still active
    const now = new Date();

    for (const [sessionId, session] of Object.entries(sessions)) {
      // Get exam details to check if it's still active
      const examSnapshot = await db.ref(`exams/${session.examId}`).once('value');
      const exam = examSnapshot.val();

      if (!exam) continue;

      const startTime = new Date(exam.startTime);
      const endTime = new Date(exam.endTime);

      // Only include sessions for active exams
      if (now >= startTime && now <= endTime) {
        // Get student details
        const studentSnapshot = await db.ref(`users/${session.studentId}`).once('value');
        const student = studentSnapshot.val();

        activeSessions.push({
          id: sessionId,
          ...session,
          studentName: student?.name || 'Unknown Student',
          examTitle: exam.title,
          examEndTime: exam.endTime
        });
      }
    }

    res.status(200).json(activeSessions);
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
};

// End monitoring session
const endMonitoringSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      return res.status(404).json({ error: 'Monitoring session not found' });
    }

    // Verify the request is from the student who started the session
    if (session.studentId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to end this session' });
    }

    await sessionRef.update({
      status: 'ended',
      endedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Monitoring session ended successfully' });
  } catch (error) {
    console.error('Error ending monitoring session:', error);
    res.status(500).json({ error: 'Failed to end monitoring session' });
  }
};

module.exports = {
  startMonitoringSession,
  updateMonitoringSession,
  getActiveSessions,
  endMonitoringSession
}; 