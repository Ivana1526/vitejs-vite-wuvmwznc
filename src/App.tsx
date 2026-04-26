// @ts-nocheck
import React, { useMemo, useState, useEffect } from "react";
import "./App.css";
import { createClient } from "@supabase/supabase-js";

// 🔥 SEM VLOŽ SVOJE ÚDAJE
const supabaseUrl = "https://cuxbeefpgtvxttrtksws.supabase.co";
const supabaseKey = "sb_publishable_BsiYen4XDNn0T7bunOfniA_Qs_jdCiB";
const supabase = createClient(supabaseUrl, supabaseKey);

const today = new Date().toISOString().slice(0, 10);

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

export default function App() {
  const [words, setWords] = useState([]);
  const [newEn, setNewEn] = useState("");
  const [newSk, setNewSk] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editEn, setEditEn] = useState("");
  const [editSk, setEditSk] = useState("");

  // 🔥 NAČÍTANIE Z CLOUDU
  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    const { data, error } = await supabase.from("words").select("*");
    if (error) {
      console.error(error);
    } else {
      setWords(data);
    }
  };

  // 🔥 PRIDANIE DO CLOUDU
  const addWord = async () => {
    if (!newEn || !newSk) return;

    const newWord = {
      id: Date.now().toString(),
      en: newEn,
      sk: newSk,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("words").insert([newWord]);

    if (!error) {
      setNewEn("");
      setNewSk("");
      loadWords();
    }
  };

  // ✏️ EDITOVANIE Z CLOUDU
  const updateWord = async (id) => {
    const { error } = await supabase
      .from("words")
      .update({ en: editEn, sk: editSk })
      .eq("id", id.toString());

    if (!error) {
      setEditingId(null);
      loadWords();
    }
  };

  // 🗑️ MAZANIE Z CLOUDU
  const deleteWord = async (id) => {
    const { error } = await supabase
      .from("words")
      .delete()
      .eq("id", id.toString());

    if (!error) {
      loadWords();
    }
  };

  return (
    <div className="app">
      <h1>🌍 Cloud verzia appky</h1>

      <div className="add-box">
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
      {words.map((w) => (
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
              <button onClick={() => speak(w.en)}>🔊</button>
              <button onClick={() => {
                setEditingId(w.id);
                setEditEn(w.en);
                setEditSk(w.sk);
              }}>✏️</button>
              <button onClick={() => deleteWord(w.id)}>🗑️</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
