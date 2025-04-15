const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middleware/auth');
const {
  createClass,
  getClasses,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  getStudentsByIds,
} = require('../controllers/classController');

// All routes require authentication and teacher role
router.use(authenticate, checkRole('teacher'));

// Get all classes for the teacher
router.get('/', getClasses);

// Create a new class
router.post('/', createClass);

// Update a class
router.put('/:id', updateClass);

// Delete a class
router.delete('/:id', deleteClass);

// Add student to class
router.post('/:id/students', addStudentToClass);

// Remove student from class
router.delete('/:id/students/:studentId', removeStudentFromClass);

// Get students by IDs
router.post('/students', getStudentsByIds);

module.exports = router; 