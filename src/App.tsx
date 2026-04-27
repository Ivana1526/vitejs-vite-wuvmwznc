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
  const [draggedWordId, setDraggedWordId] = useState(null);
  const [matches, setMatches] = useState({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
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

    const { error } = await supabase.from("words").insert([newWord]);

    if (!error) {
      setNewEn("");
      setNewSk("");
      setLessonDate(today);
      loadWords();
    } else {
      console.error(error);
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

      <div className="add-box">
        <input
          type="date"
          value={lessonDate}
          onChange={(e) => setLessonDate(e.target.value)}
        />
        <input
          placeholder="English"
          value={newEn}
          onChange={(e) => setNewEn(e.target.value)}
        />
        <input
          placeholder="Slovensky"
          value={newSk}
          onChange={(e) => setNewSk(e.target.value)}
        />
        <button onClick={addWord}>Pridať</button>
      </div>

      <h2>Slovíčka z cloudu</h2>

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
              <input value={editEn} onChange={(e) => setEditEn(e.target.value)} />
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

      <h2>🧩 Priraďovanie slovíčok</h2>
      <p>Presuň anglické slovíčko na správny slovenský preklad.</p>

      <button onClick={resetMatching}>Reset</button>

      <div className="matching-box">
        <div className="matching-column">
          <h3>EN</h3>
          {filteredWords.map((w) => (
            <div
              key={w.id}
              className="drag-card"
              draggable
              onDragStart={() => setDraggedWordId(w.id)}
            >
              {w.en}
            </div>
          ))}
        </div>

        <div className="matching-column">
          <h3>SK</h3>
          {filteredWords.map((w) => {
            const matchedId = matches[w.id];
            const matchedWord = filteredWords.find((item) => item.id === matchedId);
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
                <span>{matchedWord ? matchedWord.en : "Sem presuň EN"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
