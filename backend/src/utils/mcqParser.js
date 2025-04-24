const mammoth = require('mammoth');

const parseMCQDocument = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Split the text into individual questions
    const questions = text.split(/\d+\./).filter(q => q.trim());
    
    const parsedQuestions = questions.map(q => {
      // Extract question text (everything before options)
      const questionMatch = q.match(/^(.*?)(?=a\))/s);
      const questionText = questionMatch ? questionMatch[1].trim() : '';
      
      // Extract options
      const optionsMatch = q.match(/a\)(.*?)answer:/s);
      const optionsText = optionsMatch ? optionsMatch[1].trim() : '';
      
      // Extract answer
      const answerMatch = q.match(/answer:\s*(.*?)(?=point:|$)/s);
      const answerText = answerMatch ? answerMatch[1].trim() : '';
      
      // Extract points
      const pointsMatch = q.match(/point:\s*(\d+)/);
      const points = pointsMatch ? parseInt(pointsMatch[1]) : 5; // Default to 5 if no points specified
      
      // Parse options
      const options = optionsText.split(/\n/).filter(opt => opt.trim());
      const formattedOptions = options.map(opt => {
        const match = opt.match(/^[a-d]\)\s*(.*)/);
        return match ? match[1].trim() : opt.trim();
      });
      
      // Find correct answer index
      const correctAnswer = answerText.split(')')[1]?.trim() || '';
      const correctIndex = formattedOptions.findIndex(opt => opt === correctAnswer);
      
      return {
        text: questionText,
        type: 'multiple-choice',
        options: formattedOptions,
        correctAnswer: correctIndex,
        points: points
      };
    });
    
    return parsedQuestions;
  } catch (error) {
    console.error('Error parsing MCQ document:', error);
    throw new Error('Failed to parse MCQ document');
  }
};

module.exports = { parseMCQDocument }; 