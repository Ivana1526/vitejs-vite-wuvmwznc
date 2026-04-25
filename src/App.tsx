// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import "./App.css";

const today = new Date().toISOString().slice(0, 10);

const initialWords = [
  { id: "w1", en: "apple", sk: "jablko", lessonDate: today },
  { id: "w2", en: "teacher", sk: "učiteľ", lessonDate: today },
];

const initialSentences = [
  { id: "s1", en: "I like apples.", sk: "Mám rád jablká.", lessonDate: today },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function speak(text) {
  if (!text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  speechSynthesis.speak(u);
}

function normalizeWords(savedWords) {
  return savedWords.map((word) => ({
    ...word,
    lessonDate: word.lessonDate || today,
  }));
}

function normalizeSentences(saved) {
  return saved.map((s) => ({
    ...s,
    lessonDate: s.lessonDate || today,
  }));
}

export default function App() {
  const [words, setWords] = useState(() => {
    const saved = localStorage.getItem("words");
    return saved ? normalizeWords(JSON.parse(saved)) : initialWords;
  });

  const [sentences, setSentences] = useState(() => {
    const saved = localStorage.getItem("sentences");
    return saved ? normalizeSentences(JSON.parse(saved)) : initialSentences;
  });

  const [newEn, setNewEn] = useState("");
  const [newSk, setNewSk] = useState("");
  const [newSentenceEn, setNewSentenceEn] = useState("");
  const [newSentenceSk, setNewSentenceSk] = useState("");
  const [newLessonDate, setNewLessonDate] = useState(today);
  const [selectedLessonDate, setSelectedLessonDate] = useState("all");

  const [matches, setMatches] = useState({});
  const [dragged, setDragged] = useState(null);
  const [checked, setChecked] = useState(false);
  const [round, setRound] = useState(0);

  const [sentenceAnswers, setSentenceAnswers] = useState({});
  const [sentenceChecked, setSentenceChecked] = useState(false);

  const [flashcardType, setFlashcardType] = useState("words");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem("learningStats");
    return saved
      ? JSON.parse(saved)
      : {
          wordAttempts: 0,
          wordCorrect: 0,
          sentenceAttempts: 0,
          sentenceCorrect: 0,
        };
  });

  useEffect(() => {
    localStorage.setItem("words", JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem("sentences", JSON.stringify(sentences));
  }, [sentences]);

  useEffect(() => {
    localStorage.setItem("learningStats", JSON.stringify(stats));
  }, [stats]);

  const lessonDates = useMemo(() => {
    return Array.from(new Set([...words.map((w) => w.lessonDate), ...sentences.map((s) => s.lessonDate)])).sort().reverse();
  }, [words, sentences]);

  const wordsForExercise = useMemo(() => {
    if (selectedLessonDate === "all") return words;
    return words.filter((w) => w.lessonDate === selectedLessonDate);
  }, [words, selectedLessonDate]);

  const sentencesForExercise = useMemo(() => {
    if (selectedLessonDate === "all") return sentences;
    return sentences.filter((s) => s.lessonDate === selectedLessonDate);
  }, [sentences, selectedLessonDate]);

  const flashcardItems = flashcardType === "words" ? wordsForExercise : sentencesForExercise;
  const currentFlashcard = flashcardItems[flashcardIndex] || null;

  const en = useMemo(() => shuffle(wordsForExercise), [wordsForExercise, round]);
  const sk = useMemo(() => shuffle(wordsForExercise), [wordsForExercise, round]);

  const correct = Object.entries(matches).filter(
    ([skId, enId]) => skId === enId
  ).length;

  const sentenceCorrect = sentencesForExercise.filter((sentence) => {
    const answer = (sentenceAnswers[sentence.id] || "").trim().toLowerCase();
    return answer === sentence.en.trim().toLowerCase();
  }).length;

  const resetExercise = () => {
    setMatches({});
    setChecked(false);
    setDragged(null);
    setRound((r) => r + 1);
  };

  const resetSentenceExercise = () => {
    setSentenceAnswers({});
    setSentenceChecked(false);
  };

  const resetFlashcards = () => {
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  };

  const checkWords = () => {
    setChecked(true);
    setStats((oldStats) => ({
      ...oldStats,
      wordAttempts: oldStats.wordAttempts + wordsForExercise.length,
      wordCorrect: oldStats.wordCorrect + correct,
    }));
  };

  const checkSentences = () => {
    setSentenceChecked(true);
    setStats((oldStats) => ({
      ...oldStats,
      sentenceAttempts: oldStats.sentenceAttempts + sentencesForExercise.length,
      sentenceCorrect: oldStats.sentenceCorrect + sentenceCorrect,
    }));
  };

  const resetStats = () => {
    setStats({
      wordAttempts: 0,
      wordCorrect: 0,
      sentenceAttempts: 0,
      sentenceCorrect: 0,
    });
  };

  const changeLesson = (date) => {
    setSelectedLessonDate(date);
    resetExercise();
    resetSentenceExercise();
    resetFlashcards();
  };

  const addWord = () => {
    if (!newEn.trim() || !newSk.trim()) return;
    setWords([
      ...words,
      { id: createId("w"), en: newEn.trim(), sk: newSk.trim(), lessonDate: newLessonDate },
    ]);
    setNewEn("");
    setNewSk("");
    setSelectedLessonDate(newLessonDate);
    resetExercise();
    resetFlashcards();
  };

  const addSentence = () => {
    if (!newSentenceEn.trim() || !newSentenceSk.trim()) return;
    setSentences([
      ...sentences,
      { id: createId("s"), en: newSentenceEn.trim(), sk: newSentenceSk.trim(), lessonDate: newLessonDate },
    ]);
    setNewSentenceEn("");
    setNewSentenceSk("");
    setSelectedLessonDate(newLessonDate);
    resetSentenceExercise();
    resetFlashcards();
  };

  const deleteWord = (id) => {
    setWords(words.filter((w) => w.id !== id));
    resetExercise();
    resetFlashcards();
  };

  const deleteSentence = (id) => {
    setSentences(sentences.filter((s) => s.id !== id));
    resetSentenceExercise();
    resetFlashcards();
  };

  const groupedLessons = useMemo(() => {
    return lessonDates.map((date) => ({
      date,
      words: words.filter((w) => w.lessonDate === date),
      sentences: sentences.filter((s) => s.lessonDate === date),
    }));
  }, [words, sentences, lessonDates]);

  return (
    <div className="app">
      <h1>📘 Učenie angličtiny</h1>
      <p className="subtitle">Učivo podľa dátumu lekcie: slovíčka, vety, kartičky a cvičenia.</p>

      <div className="add-box">
        <input placeholder="English" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
        <input placeholder="Slovensky" value={newSk} onChange={(e) => setNewSk(e.target.value)} />
        <input type="date" value={newLessonDate} onChange={(e) => setNewLessonDate(e.target.value)} />
        <button onClick={addWord}>Pridať slovíčko</button>
      </div>

      <div className="add-box">
        <input placeholder="English sentence" value={newSentenceEn} onChange={(e) => setNewSentenceEn(e.target.value)} />
        <input placeholder="Slovenský význam" value={newSentenceSk} onChange={(e) => setNewSentenceSk(e.target.value)} />
        <button onClick={addSentence}>Pridať vetu</button>
      </div>

      <div className="lesson-filter">
        <label>Vybrať lekciu:</label>
        <select value={selectedLessonDate} onChange={(e) => changeLesson(e.target.value)}>
          <option value="all">Všetky</option>
          {lessonDates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <h2>📊 Tracking učenia</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span>Slovíčka správne</span>
          <strong>{stats.wordCorrect} / {stats.wordAttempts}</strong>
        </div>
        <div className="stat-card">
          <span>Vety správne</span>
          <strong>{stats.sentenceCorrect} / {stats.sentenceAttempts}</strong>
        </div>
        <div className="stat-card">
          <span>Celková úspešnosť</span>
          <strong>
            {stats.wordAttempts + stats.sentenceAttempts === 0
              ? "0 %"
              : Math.round(((stats.wordCorrect + stats.sentenceCorrect) / (stats.wordAttempts + stats.sentenceAttempts)) * 100) + " %"}
          </strong>
        </div>
      </div>
      <div className="actions">
        <button className="reset" onClick={resetStats}>Resetovať štatistiky</button>
      </div>

      <h2>🎴 Kartičky</h2>
      <div className="flashcard-panel">
        <div className="flashcard-tabs">
          <button className={flashcardType === "words" ? "active" : "secondary"} onClick={() => { setFlashcardType("words"); resetFlashcards(); }}>Slovíčka</button>
          <button className={flashcardType === "sentences" ? "active" : "secondary"} onClick={() => { setFlashcardType("sentences"); resetFlashcards(); }}>Vety</button>
        </div>

        {currentFlashcard ? (
          <>
            <div className="flashcard" onClick={() => setFlashcardFlipped(!flashcardFlipped)}>
              <div className="flashcard-label">{flashcardFlipped ? "Anglicky" : "Slovensky"}</div>
              <div className="flashcard-text">{flashcardFlipped ? currentFlashcard.en : currentFlashcard.sk}</div>
              <div className="flashcard-hint">Klikni na kartičku pre otočenie</div>
            </div>
            <div className="actions">
              <button onClick={() => speak(currentFlashcard.en)}>🔊 Výslovnosť</button>
              <button className="reset" onClick={() => { setFlashcardIndex(Math.max(0, flashcardIndex - 1)); setFlashcardFlipped(false); }}>Predchádzajúca</button>
              <button onClick={() => { setFlashcardIndex((flashcardIndex + 1) % flashcardItems.length); setFlashcardFlipped(false); }}>Ďalšia</button>
            </div>
            <p className="exercise-info">Kartička {flashcardIndex + 1} / {flashcardItems.length}</p>
          </>
        ) : (
          <div className="empty-state">Pre túto lekciu zatiaľ nie sú kartičky.</div>
        )}
      </div>

      <h2>🧠 Priraďovanie slovíčok</h2>
      <p className="exercise-info">Precvičuješ {wordsForExercise.length} slovíčok.</p>

      <div className="actions">
        <button onClick={checkWords} disabled={wordsForExercise.length === 0}>Skontrolovať</button>
        <button className="reset" onClick={resetExercise}>Reset</button>
      </div>

      {checked && <div className="result">Správne: {correct} / {wordsForExercise.length}</div>}

      {wordsForExercise.length === 0 ? (
        <div className="empty-state">Pre túto lekciu zatiaľ nie sú slovíčka.</div>
      ) : (
        <div className="columns">
          <div>
            <h3>EN</h3>
            {en.map((w) => {
              const used = Object.values(matches).includes(w.id);
              return (
                <div key={w.id} draggable={!used} onDragStart={() => setDragged(w.id)} className={used ? "card en used" : "card en"}>
                  {w.en} <button onClick={() => speak(w.en)}>🔊</button>
                </div>
              );
            })}
          </div>
          <div>
            <h3>SK</h3>
            {sk.map((w) => {
              const match = matches[w.id];
              const word = wordsForExercise.find((x) => x.id === match);
              let dropClass = "card drop";
              if (checked && match) dropClass = match === w.id ? "card drop correct" : "card drop wrong";

              return (
                <div
                  key={w.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragged) return;
                    setMatches({ ...matches, [w.id]: dragged });
                    setDragged(null);
                    setChecked(false);
                  }}
                  className={dropClass}
                >
                  <strong>{w.sk}</strong>
                  <div>{word ? word.en : "..."}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2>✍️ Cvičenie viet</h2>
      <p className="exercise-info">Napíš anglický preklad k slovenskej vete.</p>

      <div className="actions">
        <button onClick={checkSentences} disabled={sentencesForExercise.length === 0}>Skontrolovať vety</button>
        <button className="reset" onClick={resetSentenceExercise}>Reset viet</button>
      </div>

      {sentenceChecked && <div className="result">Správne vety: {sentenceCorrect} / {sentencesForExercise.length}</div>}

      {sentencesForExercise.length === 0 ? (
        <div className="empty-state">Pre túto lekciu zatiaľ nie sú vety.</div>
      ) : (
        <div className="sentence-exercise-list">
          {sentencesForExercise.map((sentence) => {
            const userAnswer = sentenceAnswers[sentence.id] || "";
            const isCorrect = userAnswer.trim().toLowerCase() === sentence.en.trim().toLowerCase();
            let rowClass = "sentence-exercise-card";
            if (sentenceChecked) rowClass = isCorrect ? "sentence-exercise-card correct" : "sentence-exercise-card wrong";

            return (
              <div key={sentence.id} className={rowClass}>
                <strong>{sentence.sk}</strong>
                <input
                  placeholder="Napíš anglickú vetu"
                  value={userAnswer}
                  onChange={(e) => {
                    setSentenceAnswers({ ...sentenceAnswers, [sentence.id]: e.target.value });
                    setSentenceChecked(false);
                  }}
                />
                {sentenceChecked && !isCorrect && <div className="correct-answer">Správne: {sentence.en}</div>}
                <button onClick={() => speak(sentence.en)}>🔊 Výslovnosť</button>
              </div>
            );
          })}
        </div>
      )}

      <h2>📅 Lekcie</h2>
      <div className="lesson-list">
        {groupedLessons.map((g) => (
          <div key={g.date} className="lesson-card">
            <h3>{g.date}</h3>

            <h4>Slovíčka</h4>
            {g.words.map((w) => (
              <div key={w.id} className="word-row">
                <div><strong>{w.en}</strong> — {w.sk}</div>
                <div>
                  <button onClick={() => speak(w.en)}>🔊</button>
                  <button className="delete" onClick={() => deleteWord(w.id)}>❌</button>
                </div>
              </div>
            ))}

            <h4>Vety</h4>
            {g.sentences.map((s) => (
              <div key={s.id} className="word-row">
                <div><strong>{s.en}</strong> — {s.sk}</div>
                <div>
                  <button onClick={() => speak(s.en)}>🔊</button>
                  <button className="delete" onClick={() => deleteSentence(s.id)}>❌</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
