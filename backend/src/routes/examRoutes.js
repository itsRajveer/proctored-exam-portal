const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const {
  createExam,
  getTeacherExams,
  getExam,
  updateExam,
  deleteExam,
  getExamSubmissions,
  gradeSubmission
} = require('../controllers/examController');

// All routes require authentication and teacher role
router.use(authenticate, checkRole('teacher'));

// Get all exams for the teacher
router.get('/', getTeacherExams);

// Create a new exam
router.post('/', createExam);

// Get a single exam
router.get('/:id', getExam);

// Update an exam
router.put('/:id', updateExam);

// Delete an exam
router.delete('/:id', deleteExam);

// Get exam submissions
router.get('/:id/submissions', getExamSubmissions);

// Grade a submission
router.put('/submissions/:id/grade', gradeSubmission);

module.exports = router; 