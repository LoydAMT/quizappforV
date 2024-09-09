import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import './App.css';

const firebaseConfig = {
  apiKey: "AIzaSyCOKko7WWVIyQDLlgvzLbvOfj5vm-KSLkY",
  authDomain: "quizcardsmaker.firebaseapp.com",
  projectId: "quizcardsmaker",
  storageBucket: "quizcardsmaker.appspot.com",
  messagingSenderId: "726216791363",
  appId: "1:726216791363:web:c7235bda2585105c788bf6",
  measurementId: "G-XFWZVBX4CW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const QuizGenerator = () => {
  const [user, setUser] = useState(null);
  const [quizText, setQuizText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [itemScores, setItemScores] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [userQuizzes, setUserQuizzes] = useState([]);
  const [publicQuizzes, setPublicQuizzes] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const userQuizzesRef = useRef(null);
  const publicQuizzesRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        fetchUserQuizzes(user.uid);
        fetchPublicQuizzes();
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const fetchUserQuizzes = async (userId) => {
    const q = query(collection(db, "quizzes"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    setUserQuizzes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchPublicQuizzes = async () => {
    const q = query(collection(db, "quizzes"), where("isPublic", "==", true));
    const querySnapshot = await getDocs(q);
    setPublicQuizzes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const saveQuiz = async () => {
    if (!user) return;
    
    const title = prompt("Please enter a title for your quiz:", quizTitle);
    if (title === null) return; // User cancelled the prompt
    
    setQuizTitle(title);
    
    try {
      const docRef = await addDoc(collection(db, "quizzes"), {
        userId: user.uid,
        title,
        quizText,
        answerText,
        isPublic,
        createdAt: new Date()
      });
      console.log("Quiz saved with ID: ", docRef.id);
      fetchUserQuizzes(user.uid);
      if (isPublic) fetchPublicQuizzes();
    } catch (error) {
      console.error("Error saving quiz: ", error);
    }
  };

  const loadQuiz = (quiz) => {
    setQuizTitle(quiz.title);
    setQuizText(quiz.quizText);
    setAnswerText(quiz.answerText);
    setIsPublic(quiz.isPublic);
  };

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions);
  };


  const togglePublic = async (quizId, currentState) => {
    try {
      await updateDoc(doc(db, "quizzes", quizId), {
        isPublic: !currentState
      });
      fetchUserQuizzes(user.uid);
      fetchPublicQuizzes();
    } catch (error) {
      console.error("Error updating quiz visibility: ", error);
    }
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
  
  const parseQuiz = (text, answers) => {
    const sections = text.split(/\n(?=(?:Enumeration|Identification|True or False|Multiple Choice))/);
    const answerLines = answers.split('\n');
    const questions = [];
    let answerIndex = 0;

    sections.forEach((section) => {
      const lines = section.trim().split('\n');
      const sectionType = lines[0].trim();
      lines.slice(1).forEach((line) => {
        if (line.trim()) {
          if (sectionType === 'Enumeration') {
            questions.push({
              type: 'enumeration',
              question: line.substring(line.indexOf('.') + 1).trim(),
              answer: answerLines[answerIndex++]?.trim() || '',
            });
          } else if (sectionType === 'Identification' || sectionType === 'True or False') {
            questions.push({
              type: 'identification',
              question: line.substring(line.indexOf('.') + 1).trim(),
              answer: answerLines[answerIndex++]?.trim() || '',
              isTrueOrFalse: sectionType === 'True or False'
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

  const renderQuestion = (question, index) => {
    const userAnswer = userAnswers[index] || '';
    let isCorrect;

    if (question.type === 'enumeration') {
      isCorrect = question.answer.split(',').every(item => userAnswer.toLowerCase().includes(item.trim().toLowerCase()));
    } else if (question.type === 'identification') {
      if (question.isTrueOrFalse) {
        isCorrect = userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
      } else {
        isCorrect = userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
      }
    } else {
      isCorrect = userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    }

    return (
      <div key={index} className={`question ${quizSubmitted ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
        <p className="question-text">{`${index + 1}. ${question.isTrueOrFalse ? '(True or False) ' : ''}${question.question}`}</p>
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
        ) : question.isTrueOrFalse ? (
          <div className="true-false-options">
            <label>
              <input
                type="radio"
                name={`question-${index}`}
                value="true"
                onChange={() => handleAnswerChange(index, 'true')}
                checked={userAnswers[index] === 'true'}
                disabled={quizSubmitted}
              />
              <span>True</span>
            </label>
            <label>
              <input
                type="radio"
                name={`question-${index}`}
                value="false"
                onChange={() => handleAnswerChange(index, 'false')}
                checked={userAnswers[index] === 'false'}
                disabled={quizSubmitted}
              />
              <span>False</span>
            </label>
          </div>
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

  const instructionsText = `
    How to format your questions:

    1. Enumeration:
       Write "Enumeration" at the beginning of the section.
       Each question should be on a new line, starting with a number.
       Example:
       Enumeration
       1. List three primary colors.

    2. Identification:
       Write "Identification" at the beginning of the section.
       Each question should be on a new line, starting with a number.
       Example:
       Identification
       1. What is the capital of France?

    3. True or False:
       Write "True or False" at the beginning of the section.
       Each statement should be on a new line, starting with a number.
       Example:
       True or False
       1. The Earth is flat.

    4. Multiple Choice:
       Write "Multiple Choice" at the beginning of the section.
       Each question should be on a new line, starting with a number.
       Options should be on separate lines, starting with A), B), C), or D).
       Example:
       Multiple Choice
       1. Which planet is known as the Red Planet?
       A) Venus
       B) Mars
       C) Jupiter
       D) Saturn

    Answers:
    Write answers in the order of questions, one per line.
    For enumeration, separate items with commas.
    For multiple choice, just write the correct letter.
    For True or False, write "true" or "false".
  `;

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="quiz-generator">
      <h1>GOODLUCK V</h1>
      {user ? (
        <>
          <div className="user-info">
            <p>Welcome, {user.displayName}!</p>
            <button onClick={signOutUser} className="sign-out-btn">Sign Out</button>
          </div>
          <div className="navigation-buttons">
            <button onClick={() => scrollToSection(userQuizzesRef)} className="nav-btn">My Quizzes</button>
            <button onClick={() => scrollToSection(publicQuizzesRef)} className="nav-btn">Public Quizzes</button>
          </div>
            {!showQuiz ? (
            <div className="quiz-input">
              <button onClick={toggleInstructions} className="instructions-btn">
                {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
              </button>
              {showInstructions && (
                <div className="instructions">
                  <pre>{instructionsText}</pre>
                </div>
              )}
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
              <div className="quiz-options">
                <label className="public-checkbox">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  Make this quiz public
                </label>
                <button onClick={saveQuiz} className="save-btn">Save Quiz</button>
                <button onClick={handleGenerateQuiz} className="generate-btn">Generate Quiz</button>
              </div>
              <div ref={userQuizzesRef}>
                <h3>Your Quizzes</h3>
                <ul className="quiz-list">
                  {userQuizzes.map((quiz) => (
                    <li key={quiz.id} className="quiz-item">
                      <span>{quiz.title || 'Untitled Quiz'}</span>
                      <div className="quiz-actions">
                        <button onClick={() => loadQuiz(quiz)} className="load-btn">Load</button>
                        <button onClick={() => togglePublic(quiz.id, quiz.isPublic)} className="visibility-btn">
                          {quiz.isPublic ? 'Make Private' : 'Make Public'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div ref={publicQuizzesRef}>
                <h3>Public Quizzes</h3>
                <ul className="quiz-list">
                  {publicQuizzes.map((quiz) => (
                    <li key={quiz.id} className="quiz-item">
                      <span>{quiz.title || 'Untitled Quiz'}</span>
                      <button onClick={() => loadQuiz(quiz)} className="load-btn">Load</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="quiz-display">
              <h2>Quiz</h2>
              {quiz.map((question, index) => renderQuestion(question, index))}
              {!quizSubmitted && (
                <div className="quiz-actions">
                  <button onClick={handleSubmitQuiz} className="submit-btn">
                    Submit Quiz
                  </button>
                  <button onClick={saveQuiz} className="save-btn">
                    Save Quiz
                  </button>
                </div>
              )}
              {quizSubmitted && (
                <div className="result">
                  <h3>Quiz Results</h3>
                  <p>Your score: {score.toFixed(2)}% ({itemScores.reduce((sum, item) => sum + item.score, 0)} / {itemScores.reduce((sum, item) => sum + item.total, 0)} points)</p>
                  <h4>Breakdown by Question:</h4>
                  <ul className="score-breakdown">
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
        </>
      ) : (
        <button onClick={signIn}>Sign In with Google</button>
      )}
    </div>
  );
};



export default QuizGenerator;