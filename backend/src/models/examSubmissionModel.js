const { db } = require('../config/firebase');

class ExamSubmission {
  constructor(data) {
    this.id = data.id;
    this.examId = data.examId;
    this.studentId = data.studentId;
    this.answers = data.answers || {};
    this.grades = data.grades || {};
    this.feedback = data.feedback || '';
    this.status = data.status || 'submitted';
    this.submittedAt = data.submittedAt || new Date().toISOString();
    this.totalScore = data.totalScore || 0;
  }

  static async create(submissionData) {
    try {
      const submissionRef = db.collection('examSubmissions').doc();
      const submission = new ExamSubmission({
        id: submissionRef.id,
        ...submissionData
      });
      
      await submissionRef.set(submission);
      return submission;
    } catch (error) {
      throw error;
    }
  }

  static async getById(id) {
    try {
      const submissionDoc = await db.collection('examSubmissions').doc(id).get();
      if (!submissionDoc.exists) {
        return null;
      }
      return new ExamSubmission(submissionDoc.data());
    } catch (error) {
      throw error;
    }
  }

  static async getByExamId(examId) {
    try {
      const snapshot = await db.collection('examSubmissions')
        .where('examId', '==', examId)
        .get();
      
      return snapshot.docs.map(doc => new ExamSubmission(doc.data()));
    } catch (error) {
      throw error;
    }
  }

  static async getByStudentId(studentId) {
    try {
      const snapshot = await db.collection('examSubmissions')
        .where('studentId', '==', studentId)
        .get();
      
      return snapshot.docs.map(doc => new ExamSubmission(doc.data()));
    } catch (error) {
      throw error;
    }
  }

  static async update(id, submissionData) {
    try {
      const submissionRef = db.collection('examSubmissions').doc(id);
      await submissionRef.update(submissionData);
      return new ExamSubmission({ id, ...submissionData });
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.collection('examSubmissions').doc(id).delete();
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ExamSubmission; 