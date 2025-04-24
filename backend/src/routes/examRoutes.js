const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, checkRole } = require('../middleware/auth');
const {
  createExam,
  getTeacherExams,
  getExam,
  updateExam,
  deleteExam,
  getExamSubmissions,
  gradeSubmission,
  uploadMCQFile
} = require('../controllers/examController');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .doc and .docx files are allowed.'));
    }
  }
});

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

// Upload MCQ document
router.post('/upload-mcq', upload.single('file'), uploadMCQFile);

module.exports = router; 