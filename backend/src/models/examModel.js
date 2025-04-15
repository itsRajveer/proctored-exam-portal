const { db } = require('../config/firebase');

class Exam {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.classId = data.classId;
    this.teacherId = data.teacherId;
    this.questions = data.questions || [];
    this.duration = data.duration;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.studentIds = data.studentIds || [];
  }

  static async create(examData) {
    try {
      const examRef = db.collection('exams').doc();
      const exam = new Exam({
        id: examRef.id,
        ...examData
      });
      
      await examRef.set(exam);
      return exam;
    } catch (error) {
      throw error;
    }
  }

  static async getById(id) {
    try {
      const examDoc = await db.collection('exams').doc(id).get();
      if (!examDoc.exists) {
        return null;
      }
      return new Exam(examDoc.data());
    } catch (error) {
      throw error;
    }
  }

  static async getByTeacherId(teacherId) {
    try {
      const snapshot = await db.collection('exams')
        .where('teacherId', '==', teacherId)
        .get();
      
      return snapshot.docs.map(doc => new Exam(doc.data()));
    } catch (error) {
      throw error;
    }
  }

  static async getByClassId(classId) {
    try {
      const snapshot = await db.collection('exams')
        .where('classId', '==', classId)
        .get();
      
      return snapshot.docs.map(doc => new Exam(doc.data()));
    } catch (error) {
      throw error;
    }
  }

  static async update(id, examData) {
    try {
      const examRef = db.collection('exams').doc(id);
      await examRef.update(examData);
      return new Exam({ id, ...examData });
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.collection('exams').doc(id).delete();
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Exam; 