const { db } = require('../config/firebase');

// Create a new exam
const createExam = async (req, res) => {
  try {
    const { title, description, duration, startTime, endTime, questions, studentIds, classId } = req.body;
    const teacherId = req.user.uid;

    if (!title || !duration || !startTime || !endTime || !questions || !classId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify class ownership
    const classSnapshot = await db.ref(`classes/${classId}`).once('value');
    const classData = classSnapshot.val();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to create exam for this class' });
    }

    // Create exam in database
    const examRef = db.ref('exams').push();
    const newExam = {
      id: examRef.key,
      title,
      description: description || '',
      duration,
      startTime,
      endTime,
      questions,
      studentIds: studentIds || classData.studentIds || [],
      teacherId,
      classId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await examRef.set(newExam);

    // Update exam count in class
    await db.ref(`classes/${classId}`).update({
      examCount: (classData.examCount || 0) + 1
    });

    res.status(201).json(newExam);
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

// Get all exams for a teacher
const getTeacherExams = async (req, res) => {
  try {
    const teacherId = req.user.uid;

    // Get exams from database
    const snapshot = await db.ref('exams')
      .orderByChild('teacherId')
      .equalTo(teacherId)
      .once('value');

    const exams = [];
    snapshot.forEach((childSnapshot) => {
      const examData = childSnapshot.val();
      if (examData) {
        exams.push(examData);
      }
    });

    res.status(200).json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to get exams' });
  }
};

// Get a single exam
const getExam = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.uid;

    const snapshot = await db.ref(`exams/${id}`).once('value');
    const examData = snapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to view this exam' });
    }

    res.status(200).json(examData);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Failed to get exam' });
  }
};

// Update an exam
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, startTime, endTime, questions, studentIds, status } = req.body;
    const teacherId = req.user.uid;

    // Verify exam ownership
    const snapshot = await db.ref(`exams/${id}`).once('value');
    const examData = snapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to update this exam' });
    }

    // Update exam
    const updates = {
      title: title || examData.title,
      description: description || examData.description,
      duration: duration || examData.duration,
      startTime: startTime || examData.startTime,
      endTime: endTime || examData.endTime,
      questions: questions || examData.questions,
      studentIds: studentIds || examData.studentIds,
      status: status || examData.status,
      updatedAt: new Date().toISOString()
    };

    await db.ref(`exams/${id}`).update(updates);

    res.status(200).json({ ...examData, ...updates });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
};

// Delete an exam
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.uid;

    // Verify exam ownership
    const snapshot = await db.ref(`exams/${id}`).once('value');
    const examData = snapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to delete this exam' });
    }

    // Delete exam
    await db.ref(`exams/${id}`).remove();

    // Update exam count in class
    const classSnapshot = await db.ref(`classes/${examData.classId}`).once('value');
    const classData = classSnapshot.val();
    if (classData) {
      await db.ref(`classes/${examData.classId}`).update({
        examCount: Math.max(0, (classData.examCount || 0) - 1)
      });
    }

    res.status(200).json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};

// Get exam submissions
const getExamSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.uid;

    // Verify exam ownership
    const examSnapshot = await db.ref(`exams/${id}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to view submissions for this exam' });
    }

    // Get submissions
    const submissionsSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(id)
      .once('value');

    const submissions = [];
    submissionsSnapshot.forEach((childSnapshot) => {
      const submissionData = childSnapshot.val();
      if (submissionData) {
        submissions.push(submissionData);
      }
    });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
};

// Grade a submission
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, feedback } = req.body;
    const teacherId = req.user.uid;

    // Get submission
    const submissionSnapshot = await db.ref(`examSubmissions/${id}`).once('value');
    const submissionData = submissionSnapshot.val();

    if (!submissionData) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Verify exam ownership
    const examSnapshot = await db.ref(`exams/${submissionData.examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to grade this submission' });
    }

    // Update submission
    const updates = {
      grades,
      feedback,
      status: 'graded',
      gradedAt: new Date().toISOString()
    };

    await db.ref(`examSubmissions/${id}`).update(updates);

    res.status(200).json({ ...submissionData, ...updates });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
};

module.exports = {
  createExam,
  getTeacherExams,
  getExam,
  updateExam,
  deleteExam,
  getExamSubmissions,
  gradeSubmission
}; 