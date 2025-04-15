const { db } = require('../config/firebase');

// Start a monitoring session
const startMonitoring = async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    const teacherId = req.user.uid;

    // Check if exam exists and belongs to the teacher
    const examRef = db.ref(`exams/${examId}`);
    const examSnapshot = await examRef.once('value');
    const exam = examSnapshot.val();

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (exam.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if student is enrolled in the exam
    if (!exam.studentIds.includes(studentId)) {
      return res.status(403).json({ error: 'Student not enrolled in this exam' });
    }

    // Check if there's an active exam submission
    const submissionsRef = db.ref('examSubmissions');
    const submissionsSnapshot = await submissionsRef
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');
    
    const submissions = submissionsSnapshot.val() || {};
    const activeSubmission = Object.values(submissions).find(
      sub => sub.studentId === studentId && sub.status === 'in-progress'
    );

    if (!activeSubmission) {
      return res.status(400).json({ error: 'No active exam submission found' });
    }

    // Create or update monitoring session
    const sessionsRef = db.ref('monitoringSessions');
    const newSessionRef = sessionsRef.push();
    
    const sessionData = {
      id: newSessionRef.key,
      examId,
      studentId,
      teacherId,
      status: 'active',
      violations: 0,
      lastViolationTime: null,
      peerId: null,
      aiFlags: []
    };

    await newSessionRef.set(sessionData);

    res.status(201).json(sessionData);
  } catch (error) {
    console.error('Error starting monitoring:', error);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
};

// Stop a monitoring session
const stopMonitoringSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user.uid;

    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      return res.status(404).json({ error: 'Monitoring session not found' });
    }

    if (session.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to stop this session' });
    }

    await sessionRef.update({
      status: 'ended',
      endTime: new Date().toISOString()
    });

    res.status(200).json({ message: 'Monitoring session stopped' });
  } catch (error) {
    console.error('Error stopping monitoring session:', error);
    res.status(500).json({ error: 'Failed to stop monitoring session' });
  }
};

// Get active monitoring sessions for a teacher
const getActiveSessions = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const { examId } = req.query;

    // First get all monitoring sessions
    const sessionsRef = db.ref('monitoringSessions');
    const sessionsSnapshot = await sessionsRef.once('value');
    const sessions = sessionsSnapshot.val() || {};

    // Filter sessions in memory
    const activeSessions = Object.entries(sessions)
      .filter(([_, session]) => {
        // Filter by teacher ID and status
        const isTeacherMatch = session.teacherId === teacherId;
        const isActive = session.status === 'active';
        const isExamMatch = !examId || session.examId === examId;
        
        return isTeacherMatch && isActive && isExamMatch;
      })
      .map(async ([id, session]) => {
        // Get student details
        const studentSnapshot = await db.ref(`users/${session.studentId}`).once('value');
        const student = studentSnapshot.val();
        
        return {
          id,
          ...session,
          studentName: student?.name || 'Unknown Student',
          studentEmail: student?.email || ''
        };
      });

    // Wait for all student details to be fetched
    const sessionsWithStudentDetails = await Promise.all(activeSessions);

    res.status(200).json(sessionsWithStudentDetails);
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
};

// Update student's WebRTC peer ID
const updatePeerId = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { peerId } = req.body;
    const studentId = req.user.uid;

    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      return res.status(404).json({ error: 'Monitoring session not found' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized to update this session' });
    }

    await sessionRef.update({ peerId });

    res.status(200).json({ message: 'Peer ID updated successfully' });
  } catch (error) {
    console.error('Error updating peer ID:', error);
    res.status(500).json({ error: 'Failed to update peer ID' });
  }
};

// Report a violation
const reportViolation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, description, timestamp } = req.body;
    const studentId = req.user.uid;

    const sessionRef = db.ref(`monitoringSessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once('value');
    const session = sessionSnapshot.val();

    if (!session) {
      return res.status(404).json({ error: 'Monitoring session not found' });
    }

    if (session.studentId !== studentId) {
      return res.status(403).json({ error: 'Unauthorized to report violations' });
    }

    const violation = {
      type,
      description,
      timestamp: timestamp || new Date().toISOString()
    };

    await sessionRef.update({
      violations: session.violations + 1,
      lastViolationTime: new Date().toISOString(),
      aiFlags: [...(session.aiFlags || []), violation]
    });

    res.status(200).json({ message: 'Violation reported successfully' });
  } catch (error) {
    console.error('Error reporting violation:', error);
    res.status(500).json({ error: 'Failed to report violation' });
  }
};

module.exports = {
  startMonitoring,
  stopMonitoringSession,
  getActiveSessions,
  updatePeerId,
  reportViolation
}; 