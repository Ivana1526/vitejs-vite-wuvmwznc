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

  const handleDrop = (skWordId) => {
    if (!draggedWordId) return;

    setMatches((prev) => ({
      ...prev,
      [skWordId]: draggedWordId,
    }));

    setDraggedWordId(null);
  };

  const resetMatching = () => {
    setMatches({});
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
        <p>Presuň anglické slovíčko na správny slovenský preklad.</p>

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
          <div className="matching-column">
            <h3>EN</h3>
            {matchingEnWords.map((w) => {
              const isMatched = Object.values(matches).includes(w.id);

              return (
                <div
                  key={w.id}
                  className="drag-card"
                  draggable={!isMatched}
                  onDragStart={() => setDraggedWordId(w.id)}
                  style={{ opacity: isMatched ? 0.2 : 1 }}
                >
                  {isMatched ? (
                    <button
                      type="button"
                      className="sound-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(w.en);
                      }}
                    >
                      🔊
                    </button>
                  ) : (
                    <>
                      <span>{w.en}</span>
                      <button
                        type="button"
                        className="sound-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(w.en);
                        }}
                      >
                        🔊
                      </button>
                    </>
                  )}
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
                  className={`drop-card ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(w.id)}
                >
                  <strong>{w.sk}</strong>
                  <span>
                    {matchedWord ? (
                      <>
                        {matchedWord.en}
                        <button
                          type="button"
                          className="sound-btn"
                          onClick={() => speak(matchedWord.en)}
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
