const { db } = require('../config/firebase');

const createTestClass = async () => {
  try {
    // Replace this with the actual teacher's UID
    const teacherId = 'RXYUGQeEKrVX6dA54fTIeQcQfnh2';
    const studentId = 'KBljv7anEfVGaRVJUGjpvEVmk2W2';
    
    const classRef = db.ref('classes').push();
    const newClass = {
      id: classRef.key,
      name: 'Test Class',
      description: 'A test class for development',
      teacherId,
      studentIds: [studentId],
      createdAt: new Date().toISOString(),
    };

    await classRef.set(newClass);
    console.log('Test class created successfully:', newClass);
  } catch (error) {
    console.error('Error creating test class:', error);
  }
};

createTestClass(); 