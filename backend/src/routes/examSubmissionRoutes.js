const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const { 
  getStudentExam, 
  submitExamAnswers, 
  saveExamProgress,
  getStudentExams,
  getTeacherExamSubmission,
  saveExamGrades,
  getStudentGrades
} = require('../controllers/examSubmissionController');

// Student routes
// router.use(authenticate, checkRole('student'));

// Get all exams for a student
router.get('/student',authenticate, checkRole('student'), getStudentExams);

// Get exam details for a student
router.get('/:examId',authenticate, checkRole('student'), getStudentExam);

// Submit exam answers
router.post('/:examId/submit', authenticate, checkRole('student'), submitExamAnswers);

// Save exam progress
router.post('/:examId/save', authenticate, checkRole('student'), saveExamProgress);

// Teacher routes
router.get('/:examId/review', authenticate, checkRole('teacher'), getTeacherExamSubmission);
router.post('/:examId/grades', authenticate, checkRole('teacher'), saveExamGrades);

// Get student's grades and statistics
router.get('/student/grades', authenticate, checkRole('student'), getStudentGrades);

module.exports = router; 