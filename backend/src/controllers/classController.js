const { db } = require('../config/firebase');

// Create a new class
const createClass = async (req, res) => {
  try {
    const { name, description, studentIds = [] } = req.body;
    const teacherId = req.user.uid;

    if (!name) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    // Create class in database
    const classRef = db.ref('classes').push();
    const newClass = {
      id: classRef.key,
      name,
      description: description || '',
      teacherId,
      studentIds,
      createdAt: new Date().toISOString(),
      examCount: 0,
      studentCount: studentIds.length
    };

    await classRef.set(newClass);

    res.status(201).json(newClass);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

// Get all classes for a teacher
const getClasses = async (req, res) => {
  try {
    const teacherId = req.user.uid;

    // Get classes from database
    const snapshot = await db.ref('classes')
      .orderByChild('teacherId')
      .equalTo(teacherId)
      .once('value');

    const classes = [];
    snapshot.forEach((childSnapshot) => {
      const classData = childSnapshot.val();
      if (classData) {
        classes.push(classData);
      }
    });

    // Get exam counts for each class
    const examSnapshot = await db.ref('exams').once('value');
    const exams = examSnapshot.val() || {};

    // Add exam counts to classes
    const classesWithStats = classes.map(classItem => {
      const examCount = Object.values(exams).filter(
        exam => exam.classId === classItem.id
      ).length;

      return {
        ...classItem,
        examCount,
        studentCount: classItem.studentIds?.length || 0,
      };
    });

    res.status(200).json(classesWithStats);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to get classes' });
  }
};

// Update a class
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const teacherId = req.user.uid;

    // Verify class ownership
    const classSnapshot = await db.ref(`classes/${id}`).once('value');
    const classData = classSnapshot.val();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to update this class' });
    }

    // Update class
    const updates = {
      name: name || classData.name,
      description: description || classData.description,
      updatedAt: new Date().toISOString(),
    };

    await db.ref(`classes/${id}`).update(updates);

    res.status(200).json({ ...classData, ...updates });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
};

// Delete a class
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.uid;

    // Verify class ownership
    const classSnapshot = await db.ref(`classes/${id}`).once('value');
    const classData = classSnapshot.val();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to delete this class' });
    }

    // Delete class
    await db.ref(`classes/${id}`).remove();

    res.status(200).json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
};

// Add student to class
const addStudentToClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const teacherId = req.user.uid;

    // Verify class ownership
    const classSnapshot = await db.ref(`classes/${id}`).once('value');
    const classData = classSnapshot.val();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to modify this class' });
    }

    // Find student by email
    const usersSnapshot = await db.ref('users')
      .orderByChild('email')
      .equalTo(email)
      .once('value');

    const users = [];
    usersSnapshot.forEach((childSnapshot) => {
      users.push(childSnapshot.val());
    });

    const student = users.find(user => user.role === 'student');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Initialize studentIds if it doesn't exist
    const currentStudentIds = classData.studentIds || [];

    if (currentStudentIds.includes(student.uid)) {
      return res.status(400).json({ error: 'Student already in class' });
    }

    // Add student to class
    const updatedStudentIds = [...currentStudentIds, student.uid];
    await db.ref(`classes/${id}`).update({ 
      studentIds: updatedStudentIds,
      studentCount: updatedStudentIds.length
    });

    res.status(200).json({
      ...classData,
      studentIds: updatedStudentIds,
      studentCount: updatedStudentIds.length
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Failed to add student to class' });
  }
};

// Remove student from class
const removeStudentFromClass = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const teacherId = req.user.uid;

    // Verify class ownership
    const classSnapshot = await db.ref(`classes/${id}`).once('value');
    const classData = classSnapshot.val();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (classData.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to modify this class' });
    }

    if (!classData.studentIds.includes(studentId)) {
      return res.status(400).json({ error: 'Student not in class' });
    }

    // Remove student from class
    const updatedStudentIds = classData.studentIds.filter(id => id !== studentId);
    await db.ref(`classes/${id}`).update({ studentIds: updatedStudentIds });

    res.status(200).json({
      ...classData,
      studentIds: updatedStudentIds,
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student from class' });
  }
};

// Get students by IDs
const getStudentsByIds = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'Student IDs array is required' });
    }

    const students = [];
    for (const studentId of studentIds) {
      const studentSnapshot = await db.ref(`users/${studentId}`).once('value');
      const studentData = studentSnapshot.val();
      if (studentData && studentData.role === 'student') {
        students.push({
          id: studentData.uid,
          name: studentData.name,
          email: studentData.email,
          role: studentData.role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name)}`,
        });
      }
    }

    res.status(200).json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
};

module.exports = {
  createClass,
  getClasses,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  getStudentsByIds,
}; 