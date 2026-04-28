// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import "./App.css";
import { createClient } from "@supabase/supabase-js";

// 🔥 SEM VLOŽ SVOJE ÚDAJE
const supabaseUrl = "https://cuxbeefpgtvxttrtksws.supabase.co";
const supabaseKey = "sb_publishable_BsiYen4XDNn0T7bunOfniA_Qs_jdCiB";
const supabase = createClient(supabaseUrl, supabaseKey);

const today = new Date().toISOString().slice(0, 10);

function speak(text) {
  if (!text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  speechSynthesis.speak(u);
}

function formatDate(date) {
  if (!date) return "Bez dátumu";
  return date;
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleWithoutSameRows(enWords, skWords) {
  if (enWords.length <= 1) return skWords;

  let shuffled = shuffleArray(skWords);
  let tries = 0;

  while (tries < 50 && shuffled.some((word, index) => word.id === enWords[index]?.id)) {
    shuffled = shuffleArray(skWords);
    tries++;
  }

  if (shuffled.some((word, index) => word.id === enWords[index]?.id)) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }

  return shuffled;
}

export default function App() {
  const [password, setPassword] = useState("");
  const [words, setWords] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  const [newEn, setNewEn] = useState("");
  const [newSk, setNewSk] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [editEn, setEditEn] = useState("");
  const [editSk, setEditSk] = useState("");
  const [search, setSearch] = useState("");
  const [lessonDate, setLessonDate] = useState(today);
  const [filterDate, setFilterDate] = useState("all");
  const [matchingSearch, setMatchingSearch] = useState("");
  const [matchingFilterDate, setMatchingFilterDate] = useState("all");
  const [draggedWordId, setDraggedWordId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [matches, setMatches] = useState({});
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadWords();
    }
  }, [user]);

  useEffect(() => {
    if (!draggedWordId) return;

    const handleAutoScroll = (e) => {
      const edgeSize = 90;
      const scrollSpeed = 14;

      if (e.clientY < edgeSize) {
        window.scrollBy({ top: -scrollSpeed, behavior: "auto" });
      }

      if (window.innerHeight - e.clientY < edgeSize) {
        window.scrollBy({ top: scrollSpeed, behavior: "auto" });
      }
    };

    window.addEventListener("dragover", handleAutoScroll);

    return () => {
      window.removeEventListener("dragover", handleAutoScroll);
    };
  }, [draggedWordId]);

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) alert(error.message);
    else alert("Registrácia hotová. Teraz klikni Login.");
  };

  const signIn = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
    else {
      setUser(data.user);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWords([]);
    setMatches({});
  };

  const loadWords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("words")
      .select("*")
      .eq("user_id", user.id)
      .order("lesson_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setWords(data || []);
    }
  };

  const addWord = async () => {
    if (!user) return;
    if (!newEn || !newSk) return;

    const newWord = {
      id: Date.now().toString(),
      en: newEn,
      sk: newSk,
      lesson_date: lessonDate || today,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from("words")
      .insert([newWord])
      .select()
      .single();

    if (!error) {
      setWords((prev) => [data, ...prev]);
      setNewEn("");
      setNewSk("");
      setLessonDate(today);
    } else {
      console.error(error);
      alert(error.message);
    }
  };

  const updateWord = async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from("words")
      .update({ en: editEn, sk: editSk })
      .eq("id", id.toString())
      .eq("user_id", user.id);

    if (!error) {
      setEditingId(null);
      loadWords();
    } else {
      console.error(error);
    }
  };

  const deleteWord = async (id) => {
    if (!user) return;

    const { error } = await supabase
      .from("words")
      .delete()
      .eq("id", id.toString())
      .eq("user_id", user.id);

    if (!error) {
      loadWords();
    } else {
      console.error(error);
    }
  };

  const dateOptions = useMemo(() => {
    const dates = words
      .map((w) => w.lesson_date)
      .filter(Boolean);

    return [...new Set(dates)].sort().reverse();
  }, [words]);

  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      const matchesSearch =
        w.en.toLowerCase().includes(search.toLowerCase()) ||
        w.sk.toLowerCase().includes(search.toLowerCase());

      const matchesDate = filterDate === "all" || w.lesson_date === filterDate;

      return matchesSearch && matchesDate;
    });
  }, [words, search, filterDate]);

  const matchingWords = useMemo(() => {
    return words.filter((w) => {
      const matchesSearch =
        w.en.toLowerCase().includes(matchingSearch.toLowerCase()) ||
        w.sk.toLowerCase().includes(matchingSearch.toLowerCase());

      const matchesDate =
        matchingFilterDate === "all" || w.lesson_date === matchingFilterDate;

      return matchesSearch && matchesDate;
    });
  }, [words, matchingSearch, matchingFilterDate]);

  const matchingEnWords = useMemo(() => {
    return shuffleArray(matchingWords);
  }, [matchingWords, shuffleSeed]);

  const matchingSkWords = useMemo(() => {
    return shuffleWithoutSameRows(matchingEnWords, matchingWords);
  }, [matchingEnWords, matchingWords, shuffleSeed]);

  const correctCount = Object.keys(matches).filter(
    (skId) => matches[skId] === skId
  ).length;

  const totalCount = matchingWords.length;

  const moveWordToSk = (skWordId, wordId) => {
    if (!wordId) return;

    setMatches((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((key) => {
        if (updated[key] === wordId) {
          delete updated[key];
        }
      });

      updated[skWordId] = wordId;
      return updated;
    });
  };

  const returnWordToEn = (wordId) => {
    if (!wordId) return;

    setMatches((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((key) => {
        if (updated[key] === wordId) {
          delete updated[key];
        }
      });

      return updated;
    });
  };

  const handleDrop = (skWordId) => {
    if (!draggedWordId) return;
    moveWordToSk(skWordId, draggedWordId);
    setDraggedWordId(null);
  };

  const handleReturnToEn = () => {
    if (!draggedWordId) return;
    returnWordToEn(draggedWordId);
    setDraggedWordId(null);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    if (!touch) return;

    const edgeSize = 90;
    const scrollSpeed = 14;

    if (touch.clientY < edgeSize) {
      window.scrollBy({ top: -scrollSpeed, behavior: "auto" });
    }

    if (window.innerHeight - touch.clientY < edgeSize) {
      window.scrollBy({ top: scrollSpeed, behavior: "auto" });
    }
  };

  const handleTouchEnd = (e) => {
    if (!draggedWordId) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropTarget = target?.closest?.("[data-drop-id]");
    const enTarget = target?.closest?.("[data-return-zone='en']");

    if (dropTarget) {
      moveWordToSk(dropTarget.dataset.dropId, draggedWordId);
    } else if (enTarget) {
      returnWordToEn(draggedWordId);
    }

    setDraggedWordId(null);
  };

  const selectWordForMobile = (wordId) => {
    setSelectedWordId((prev) => (prev === wordId ? null : wordId));
  };

  const handleMobileDrop = (skWordId) => {
    if (!selectedWordId) return;
    moveWordToSk(skWordId, selectedWordId);
    setSelectedWordId(null);
  };

  const handleMobileReturnToEn = () => {
    if (!selectedWordId) return;
    returnWordToEn(selectedWordId);
    setSelectedWordId(null);
  };

  const resetMatching = () => {
    setMatches({});
    setSelectedWordId(null);
    setDraggedWordId(null);
    setShuffleSeed((prev) => prev + 1);
  };

  if (!user) {
    return (
      <div className="auth-box">
        <h2>Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={signIn}>Login</button>
        <button onClick={signUp}>Registrácia</button>
      </div>
    );
  }

  return (
    <div className="app">
      <button onClick={signOut}>Odhlásiť</button>
      <h1>🌍 Cloud verzia appky</h1>

      <section className="app-section add-section">
        <h2>➕ Pridať slovíčko</h2>

        <div className="add-box">
          <input
            type="date"
            value={lessonDate}
            onChange={(e) => setLessonDate(e.target.value)}
          />
          <input
            placeholder="English"
            value={newEn}
            spellCheck={true}
            lang="en"
            onChange={(e) => setNewEn(e.target.value)}
          />
          <input
            placeholder="Slovensky"
            value={newSk}
            onChange={(e) => setNewSk(e.target.value)}
          />
          <button onClick={addWord}>Pridať</button>
        </div>
      </section>

      <section className="app-section matching-section">
        <h2>🧩 Priraďovanie slovíčok</h2>
        <p>Presuň anglické slovíčko na správny slovenský preklad. Na mobile najprv ťukni na EN slovíčko a potom na SK preklad.</p>

        <div className="progress-box">
          <div
            className="progress-bar"
            style={{ width: `${(correctCount / totalCount) * 100 || 0}%` }}
          />
          <span>{correctCount} / {totalCount} správne</span>
        </div>

        <div className="filters">
          <input
            placeholder="Hľadať v hre..."
            value={matchingSearch}
            onChange={(e) => setMatchingSearch(e.target.value)}
          />

          <select
            value={matchingFilterDate}
            onChange={(e) => setMatchingFilterDate(e.target.value)}
          >
            <option value="all">Všetky lekcie</option>
            {dateOptions.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>

          <button onClick={resetMatching}>Reset</button>
        </div>

        <div className="matching-box">
          <div
            className="matching-column"
            data-return-zone="en"
            onClick={handleMobileReturnToEn}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleReturnToEn}
          >
            <h3>EN</h3>
            {matchingEnWords.map((w) => {
              const isMatched = Object.values(matches).includes(w.id);

              return (
                <div
                  key={w.id}
                  className={`drag-card ${selectedWordId === w.id ? "selected" : ""}`}
                  draggable={!isMatched}
                  onDragStart={() => setDraggedWordId(w.id)}
                  onTouchStart={() => setDraggedWordId(w.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isMatched) selectWordForMobile(w.id);
                  }}
                  style={{ opacity: isMatched ? 0.2 : 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  {isMatched ? (
                    <span />
                  ) : (
                    <span>{w.en}</span>
                  )}

                  <button
                    type="button"
                    className="sound-btn"
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(w.en);
                    }}
                  >
                    🔊
                  </button>
                </div>
              );
            })}
          </div>

          <div className="matching-column">
            <h3>SK</h3>
            {matchingSkWords.map((w) => {
              const matchedId = matches[w.id];
              const matchedWord = matchingWords.find((item) => item.id === matchedId);
              const isCorrect = matchedId === w.id;
              const isWrong = matchedId && matchedId !== w.id;

              return (
                <div
                  key={w.id}
                  data-drop-id={w.id}
                  className={`drop-card ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  onClick={() => handleMobileDrop(w.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(w.id)}
                >
                  <strong>{w.sk}</strong>
                  <span
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
                    draggable={!!matchedWord}
                    onDragStart={() => {
                      if (matchedWord) setDraggedWordId(matchedWord.id);
                    }}
                    onTouchStart={() => {
                      if (matchedWord) setDraggedWordId(matchedWord.id);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (matchedWord) selectWordForMobile(matchedWord.id);
                    }}
                  >
                    {matchedWord ? (
                      <>
                        <span>{matchedWord.en}</span>
                        <button
                          type="button"
                          className="sound-btn"
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(matchedWord.en);
                          }}
                        >
                          🔊
                        </button>
                      </>
                    ) : (
                      "Sem presuň EN"
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="app-section words-section">
        <h2>📚 Slovíčka z cloudu</h2>

        <div className="filters">
          <input
            placeholder="Hľadať..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">Všetky lekcie</option>
            {dateOptions.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>

        {filteredWords.map((w) => (
          <div key={w.id} className="word-row">
            {editingId === w.id ? (
              <>
                <input
                  value={editEn}
                  spellCheck={true}
                  lang="en"
                  onChange={(e) => setEditEn(e.target.value)}
                />
                <input value={editSk} onChange={(e) => setEditSk(e.target.value)} />
                <button onClick={() => updateWord(w.id)}>💾</button>
              </>
            ) : (
              <>
                <strong>{w.en}</strong> — {w.sk}
                <span className="lesson-date">📅 {formatDate(w.lesson_date)}</span>
                <button onClick={() => speak(w.en)}>🔊</button>
                <button
                  onClick={() => {
                    setEditingId(w.id);
                    setEditEn(w.en);
                    setEditSk(w.sk);
                  }}
                >
                  ✏️
                </button>
                <button onClick={() => deleteWord(w.id)}>🗑️</button>
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
