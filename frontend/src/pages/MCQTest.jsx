import React, { useEffect, useState } from "react";

const MCQTest = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch Questions From Flask
  useEffect(() => {
    fetch("http://localhost:5000/api/mcq")
      .then((res) => res.json())
      .then((data) => {
        const shuffled = data.map((q) => ({
          ...q,
          options: shuffleArray(q.options),
        }));
        setQuestions(shuffled);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching MCQs:", err);
        setLoading(false);
      });
  }, []);

  // Shuffle Options
  const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const handleOptionClick = (option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: option,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) return <div style={styles.center}>Loading MCQs...</div>;
  if (questions.length === 0) return <div>No questions available.</div>;

  const currentQuestion = questions[currentIndex];

  const getOptionStyle = (option) => {
    const selected = selectedAnswers[currentIndex];
    const correct = currentQuestion.correct_answer;

    if (!showResult) {
      return selected === option ? styles.selectedOption : styles.option;
    }

    if (option === correct) return styles.correctOption;
    if (selected === option && option !== correct)
      return styles.incorrectOption;

    return styles.option;
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correct_answer) {
        score++;
      }
    });
    return score;
  };

  return (
    <div style={styles.container}>
      {!showResult ? (
        <div style={styles.card}>
          <h2>
            Question {currentIndex + 1} / {questions.length}
          </h2>

          <p style={styles.question}>{currentQuestion.question}</p>

          <div>
            {currentQuestion.options.map((option, idx) => (
              <div
                key={idx}
                style={getOptionStyle(option)}
                onClick={() => handleOptionClick(option)}
              >
                {option}
              </div>
            ))}
          </div>

          <div style={styles.navigation}>
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              style={styles.button}
            >
              Previous
            </button>

            <button onClick={handleNext} style={styles.button}>
              {currentIndex === questions.length - 1
                ? "Submit"
                : "Next"}
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <h2>Test Completed 🎉</h2>
          <p>
            Your Score: {calculateScore()} / {questions.length}
          </p>

          <button
            style={styles.button}
            onClick={() => {
              setShowResult(false);
              setCurrentIndex(0);
              setSelectedAnswers({});
            }}
          >
            Retake Test
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1f2937, #111827)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    color: "white",
  },
  card: {
    width: "600px",
    background: "#1e293b",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0px 10px 25px rgba(0,0,0,0.5)",
    animation: "fadeIn 0.4s ease-in-out",
  },
  question: {
    fontSize: "18px",
    marginBottom: "20px",
  },
  option: {
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    background: "#334155",
    cursor: "pointer",
    transition: "0.3s",
  },
  selectedOption: {
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    background: "#2563eb",
    cursor: "pointer",
    transition: "0.3s",
  },
  correctOption: {
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    background: "#16a34a",
    cursor: "pointer",
  },
  incorrectOption: {
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    background: "#dc2626",
    cursor: "pointer",
  },
  navigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "20px",
  },
  button: {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    background: "#3b82f6",
    color: "white",
    transition: "0.3s",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    color: "white",
  },
};

export default MCQTest;