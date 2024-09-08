import React, { useState } from 'react';
import './App.css';

const QuizGenerator = () => {
  const [quizText, setQuizText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [itemScores, setItemScores] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const parseQuiz = (text, answers) => {
    const sections = text.split(/\n(?=(?:Enumeration|Identification|Multiple Choice))/);
    const answerLines = answers.split('\n');
    const questions = [];
    let answerIndex = 0;

    sections.forEach((section) => {
      const lines = section.trim().split('\n');
      const sectionType = lines[0].trim();
      lines.slice(1).forEach((line) => {
        if (line.trim()) {
          if (sectionType === 'Enumeration' || sectionType === 'Identification') {
            questions.push({
              type: sectionType.toLowerCase(),
              question: line.substring(line.indexOf('.') + 1).trim(),
              answer: answerLines[answerIndex++]?.trim() || '',
            });
          } else if (sectionType === 'Multiple Choice') {
            if (line.match(/^\d+\./)) {
              questions.push({
                type: 'multiple-choice',
                question: line.substring(line.indexOf('.') + 1).trim(),
                options: [],
                answer: answerLines[answerIndex++]?.trim() || '',
              });
            } else if (line.trim().match(/^[A-D]\)/)) {
              questions[questions.length - 1].options.push(line.trim());
            }
          }
        }
      });
    });

    return questions;
  };

  const handleGenerateQuiz = () => {
    const parsedQuiz = parseQuiz(quizText, answerText);
    setQuiz(parsedQuiz);
    setShowQuiz(true);
    setUserAnswers({});
    setScore(null);
    setItemScores([]);
    setQuizSubmitted(false);
    setShowComparison(false);
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers({ ...userAnswers, [questionIndex]: answer });
  };
  
  const handleSubmitQuiz = () => {
    let correctAnswers = 0;
    let totalItems = 0;
    const newItemScores = [];
  
    quiz.forEach((question, index) => {
      const userAnswer = userAnswers[index] || '';
      let questionScore = 0;
      let questionTotal = 0;

      if (question.type === 'multiple-choice') {
        if (userAnswer.toLowerCase() === question.answer.toLowerCase()) {
          correctAnswers++;
          questionScore = 1;
        }
        totalItems++;
        questionTotal = 1;
      } else if (question.type === 'enumeration') {
        const correctItems = question.answer.split(',').map(item => item.trim().toLowerCase());
        const userItems = userAnswer.split(',').map(item => item.trim().toLowerCase());
        
        correctItems.forEach((item) => {
          if (userItems.includes(item)) {
            correctAnswers++;
            questionScore++;
          }
        });
  
        totalItems += correctItems.length;
        questionTotal = correctItems.length;
      } else {
        // Identification
        if (userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()) {
          correctAnswers++;
          questionScore = 1;
        }
        totalItems++;
        questionTotal = 1;
      }

      newItemScores.push({
        question: question.question,
        score: questionScore,
        total: questionTotal,
      });
    });
  
    setScore((correctAnswers / totalItems) * 100);
    setItemScores(newItemScores);
    setQuizSubmitted(true);
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setScore(null);
    setItemScores([]);
    setQuizSubmitted(false);
    setShowComparison(false);
  };

  const handleCompareAnswers = () => {
    setShowComparison(!showComparison);
  };
  
  const renderQuestion = (question, index) => {
    const userAnswer = userAnswers[index] || '';
    const isCorrect = question.type === 'enumeration' 
      ? question.answer.split(',').every(item => userAnswer.toLowerCase().includes(item.trim().toLowerCase()))
      : userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();

    return (
      <div key={index} className={`question ${quizSubmitted ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
        <p className="question-text">{`${index + 1}. (${question.type}) ${question.question}`}</p>
        {question.type === 'multiple-choice' ? (
          question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="option">
              <label>
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option[0]}
                  onChange={() => handleAnswerChange(index, option[0])}
                  checked={userAnswers[index] === option[0]}
                  disabled={quizSubmitted}
                />
                <span>{option}</span>
              </label>
            </div>
          ))
        ) : (
          <input
            type="text"
            value={userAnswers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            placeholder="Enter your answer"
            className="answer-input"
            disabled={quizSubmitted}
          />
        )}
        {quizSubmitted && showComparison && (
          <div className="comparison">
            <p><strong>Your answer:</strong> {userAnswer}</p>
            <p><strong>Correct answer:</strong> {question.answer}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="quiz-generator">
      <h1>Goodluck!</h1>
      {!showQuiz ? (
        <div className="quiz-input">
          <div className="input-section">
            <h2>Questions</h2>
            <textarea
              value={quizText}
              onChange={(e) => setQuizText(e.target.value)}
              placeholder="Enter your quiz questions here..."
              className="text-input"
            />
          </div>
          <div className="input-section">
            <h2>Answers</h2>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Enter your answers here, one per line..."
              className="text-input"
            />
          </div>
          <button onClick={handleGenerateQuiz} className="generate-btn">
            Generate Quiz
          </button>
        </div>
      ) : (
        <div className="quiz-display">
          <h2>Quiz</h2>
          {quiz.map((question, index) => renderQuestion(question, index))}
          {!quizSubmitted && (
            <button onClick={handleSubmitQuiz} className="submit-btn">
              Submit Quiz
            </button>
          )}
          {quizSubmitted && (
            <div className="result">
              <h3>Quiz Results</h3>
              <p>Your score: {score.toFixed(2)}% ({itemScores.reduce((sum, item) => sum + item.score, 0)} / {itemScores.reduce((sum, item) => sum + item.total, 0)} points)</p>
              <h4>Breakdown by Question:</h4>
              <ul>
                {itemScores.map((item, index) => (
                  <li key={index}>
                    Question {index + 1}: {item.score} / {item.total} points
                  </li>
                ))}
              </ul>
              <div className="button-group">
                <button onClick={handleRetakeQuiz} className="retake-btn">
                  Retake Quiz
                </button>
                <button onClick={handleCompareAnswers} className="compare-btn">
                  {showComparison ? 'Hide Answers' : 'Compare Answers'}
                </button>
              </div>
            </div>
          )}
          <button onClick={() => setShowQuiz(false)} className="new-quiz-btn">
            Create New Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizGenerator;