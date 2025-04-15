const { db } = require('../config/firebase');

// Get all exams for a student
const getStudentExams = async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Get all exams
    const examsSnapshot = await db.ref('exams').once('value');
    const exams = examsSnapshot.val() || {};

    // Filter exams where the student is enrolled
    const studentExams = Object.entries(exams)
      .filter(([_, exam]) => exam.studentIds && exam.studentIds.includes(studentId))
      .map(([id, exam]) => ({
        id,
        ...exam,
        // Remove answers from questions
        questions: exam.questions.map(q => ({
          ...q,
          correctAnswer: undefined
        }))
      }));

    res.status(200).json(studentExams);
  } catch (error) {
    console.error('Get student exams error:', error);
    res.status(500).json({ error: 'Failed to get student exams' });
  }
};

// Get exam details for a student
const getStudentExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.uid;

    // Get exam details
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if student is allowed to take this exam
    if (!examData.studentIds || !examData.studentIds.includes(studentId)) {
      return res.status(403).json({ error: 'You are not authorized to take this exam' });
    }

    // Get student's submission
    const submissionSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');

    let submission = null;
    submissionSnapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (data.studentId === studentId) {
        submission = data;
      }
    });

    // If exam is already submitted, return error
    if (submission && submission.status === 'submitted') {
      return res.status(400).json({ error: 'You have already submitted this exam' });
    }

    // Check if exam is active
    const now = new Date();
    const startTime = new Date(examData.startTime);
    const endTime = new Date(examData.endTime);

    if (now < startTime) {
      return res.status(400).json({ error: 'Exam has not started yet' });
    }

    if (now > endTime) {
      return res.status(400).json({ error: 'Exam has ended' });
    }

    // Return exam details without answers
    const examDetails = {
      id: examId,
      title: examData.title,
      description: examData.description,
      classId: examData.classId,
      teacherId: examData.teacherId,
      questions: examData.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        points: q.points,
        order: q.order
      })),
      duration: examData.duration,
      startTime: examData.startTime,
      endTime: examData.endTime
    };

    res.status(200).json({
      exam: examDetails,
      submission
    });
  } catch (error) {
    console.error('Get student exam error:', error);
    res.status(500).json({ error: 'Failed to get exam details' });
  }
};

// Submit exam answers
const submitExamAnswers = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.uid;

    // Get exam details
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if student is allowed to take this exam
    if (!examData.studentIds.includes(studentId)) {
      return res.status(403).json({ error: 'You are not authorized to take this exam' });
    }

    // Check if exam is still active
    const now = new Date();
    const endTime = new Date(examData.endTime);

    if (now > endTime) {
      return res.status(400).json({ error: 'Exam has ended' });
    }

    // Check if student has already submitted
    const submissionSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');

    let existingSubmission = null;
    submissionSnapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (data.studentId === studentId) {
        existingSubmission = { ...data, id: childSnapshot.key };
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'You have already submitted this exam' });
    }

    // Create new submission
    const submissionRef = db.ref('examSubmissions').push();
    const newSubmission = {
      id: submissionRef.key,
      examId,
      studentId,
      answers,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    await submissionRef.set(newSubmission);

    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
};

// Save exam progress
const saveExamProgress = async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.uid;

    // Get exam details
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if student is allowed to take this exam
    if (!examData.studentIds.includes(studentId)) {
      return res.status(403).json({ error: 'You are not authorized to take this exam' });
    }

    // Check if exam is still active
    const now = new Date();
    const endTime = new Date(examData.endTime);

    if (now > endTime) {
      return res.status(400).json({ error: 'Exam has ended' });
    }

    // Get or create submission
    const submissionSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');

    let submissionRef = null;
    let existingSubmission = null;

    submissionSnapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      if (data.studentId === studentId) {
        existingSubmission = { ...data, id: childSnapshot.key };
        submissionRef = db.ref(`examSubmissions/${childSnapshot.key}`);
      }
    });

    if (!submissionRef) {
      submissionRef = db.ref('examSubmissions').push();
    }

    const submissionData = {
      id: submissionRef.key,
      examId,
      studentId,
      answers,
      lastSavedAt: new Date().toISOString(),
      status: 'in-progress'
    };

    await submissionRef.set(submissionData);

    res.status(200).json(submissionData);
  } catch (error) {
    console.error('Save exam progress error:', error);
    res.status(500).json({ error: 'Failed to save exam progress' });
  }
};

// Get exam submission for teacher review
const getTeacherExamSubmission = async (req, res) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user.uid;

    // Get exam details to verify ownership
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to view this exam' });
    }

    // Get submission
    const submissionSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');

    let submission = null;
    submissionSnapshot.forEach((childSnapshot) => {
      submission = childSnapshot.val();
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get student details
    const studentSnapshot = await db.ref(`users/${submission.studentId}`).once('value');
    const studentData = studentSnapshot.val();

    if (studentData) {
      submission.studentName = studentData.name;
    }

    res.status(200).json({
      exam: examData,
      submission
    });
  } catch (error) {
    console.error('Get teacher exam submission error:', error);
    res.status(500).json({ error: 'Failed to get exam submission' });
  }
};

// Save exam grades for teacher review
const saveExamGrades = async (req, res) => {
  try {
    const { examId } = req.params;
    const { grades, feedback } = req.body;
    const teacherId = req.user.uid;

    // Get exam details to verify ownership
    const examSnapshot = await db.ref(`exams/${examId}`).once('value');
    const examData = examSnapshot.val();

    if (!examData) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (examData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to grade this exam' });
    }

    // Get submission
    const submissionSnapshot = await db.ref('examSubmissions')
      .orderByChild('examId')
      .equalTo(examId)
      .once('value');

    let submissionRef = null;
    let submissionId = null;

    submissionSnapshot.forEach((childSnapshot) => {
      submissionRef = db.ref(`examSubmissions/${childSnapshot.key}`);
      submissionId = childSnapshot.key;
    });

    if (!submissionRef) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission with grades and feedback
    const updates = {
      grades,
      feedback,
      gradedAt: new Date().toISOString(),
      gradedBy: teacherId
    };

    await submissionRef.update(updates);

    res.status(200).json({
      id: submissionId,
      ...updates
    });
  } catch (error) {
    console.error('Save exam grades error:', error);
    res.status(500).json({ error: 'Failed to save exam grades' });
  }
};

const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.user.uid; // Get student ID from authenticated user

    // Get all exam submissions for the student
    const submissionsSnapshot = await db.ref('examSubmissions')
      .orderByChild('studentId')
      .equalTo(studentId)
      .once('value');

    const submissions = submissionsSnapshot.val() || {};

    if (Object.keys(submissions).length === 0) {
      return res.status(200).json({
        grades: [],
        statistics: {
          totalExams: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          gradeDistribution: {
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            F: 0
          }
        }
      });
    }

    const grades = [];
    let totalScore = 0;
    let highestScore = 0;
    let lowestScore = 100;
    const gradeDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0
    };

    // Process each submission
    for (const [submissionId, submission] of Object.entries(submissions)) {
      if (submission.status !== 'submitted') continue;
      
      // Get the exam details
      const examSnapshot = await db.ref(`exams/${submission.examId}`).once('value');
      const exam = examSnapshot.val();

      if (!exam) continue;

      // Calculate total points and score
      const totalPoints = Object.values(submission.grades || {}).reduce((sum, grade) => sum + grade, 0);
      const maxPoints = Object.keys(submission.grades || {}).length * 10; // Assuming each question is worth 10 points
      const percentage = (totalPoints / maxPoints) * 100;

      // Get all submissions for this exam to calculate class average
      const examSubmissionsSnapshot = await db.ref('examSubmissions')
        .orderByChild('examId')
        .equalTo(submission.examId)
        .once('value');

      const examSubmissions = examSubmissionsSnapshot.val() || {};
      let classTotalScore = 0;
      let classSubmissionCount = 0;

      Object.values(examSubmissions).forEach(submissionData => {
        if (submissionData.status !== 'submitted') return;
        
        const submissionPoints = Object.values(submissionData.grades || {}).reduce((sum, grade) => sum + grade, 0);
        const submissionMaxPoints = Object.keys(submissionData.grades || {}).length * 10;
        const submissionPercentage = (submissionPoints / submissionMaxPoints) * 100;
        
        classTotalScore += submissionPercentage;
        classSubmissionCount++;
      });

      const classAverage = classSubmissionCount > 0 ? Math.round(classTotalScore / classSubmissionCount) : 0;

      // Determine grade letter
      let gradeLetter = 'F';
      if (percentage >= 90) gradeLetter = 'A';
      else if (percentage >= 80) gradeLetter = 'B';
      else if (percentage >= 70) gradeLetter = 'C';
      else if (percentage >= 60) gradeLetter = 'D';

      // Update statistics
      totalScore += percentage;
      highestScore = Math.max(highestScore, percentage);
      lowestScore = Math.min(lowestScore, percentage);
      gradeDistribution[gradeLetter]++;

      // Add to grades array
      grades.push({
        id: submissionId,
        examId: submission.examId,
        examTitle: exam.title,
        date: submission.submittedAt,
        score: totalPoints,
        totalPoints: maxPoints,
        percentage: Math.round(percentage),
        grade: gradeLetter,
        feedback: submission.feedback || '',
        classAverage: classAverage
      });
    }

    // Calculate final statistics
    const totalExams = grades.length;
    const averageScore = totalExams > 0 ? Math.round(totalScore / totalExams) : 0;

    res.status(200).json({
      grades,
      statistics: {
        totalExams,
        averageScore,
        highestScore: Math.round(highestScore),
        lowestScore: Math.round(lowestScore),
        gradeDistribution
      }
    });
  } catch (error) {
    console.error('Error getting student grades:', error);
    res.status(500).json({ error: 'Failed to get student grades' });
  }
};

module.exports = {
  getStudentExams,
  getStudentExam,
  submitExamAnswers,
  saveExamProgress,
  getTeacherExamSubmission,
  saveExamGrades,
  getStudentGrades
}; 