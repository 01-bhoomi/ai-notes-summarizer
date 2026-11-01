import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Sun, Moon, Search, FileText, Mic, MicOff, Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NoteCard from "../components/NoteCard";
import SkeletonCard from "../components/SkeletonCard";
import { extractTextFromPDF } from "../utils/pdfReader";

const TAGS = ["General", "Work", "Study", "Personal"];

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [summaryLength, setSummaryLength] = useState("medium");
  const [tag, setTag] = useState("General");
  const [outputType, setOutputType] = useState("summary");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("All");
  const [filterOutputType, setFilterOutputType] = useState("All");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listeningField, setListeningField] = useState(null); // "title" | "notes" | null

  const recognitionRef = useRef(null);
  const activeFieldRef = useRef(null);
  const processedRef = useRef(0);

  const [showTip, setShowTip] = useState(() => {
    return !localStorage.getItem("hasSeenTip");
  });

  const dismissTip = () => {
    localStorage.setItem("hasSeenTip", "true");
    setShowTip(false);
  };

  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const fetchNotes = async (pageNum = 1, loadAllRemaining = false) => {
    try {
      const res = await API.get(`/notes?page=${pageNum}&limit=10`);
      if (pageNum === 1) {
        setNotes(res.data.notes);
      } else {
        setNotes((prev) => [...prev, ...res.data.notes]);
      }
      setTotalPages(res.data.totalPages);
      setPage(pageNum);

      if (loadAllRemaining && pageNum < res.data.totalPages) {
        for (let p = pageNum + 1; p <= res.data.totalPages; p++) {
          const nextRes = await API.get(`/notes?page=${p}&limit=10`);
          setNotes((prev) => [...prev, ...nextRes.data.notes]);
        }
        setPage(res.data.totalPages);
      }
    } catch (err) {
      setError("Failed to load notes");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

      recognition.onresult = (event) => {
      let transcript = "";
      for (let i = processedRef.current; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + " ";
          processedRef.current = i + 1;
        }
      }
      if (!transcript) return;

      if (activeFieldRef.current === "title") {
        setTitle((prev) => (prev ? prev + " " + transcript : transcript).trim());
      } else if (activeFieldRef.current === "notes") {
        setOriginalText((prev) => (prev ? prev + " " + transcript : transcript).trim());
      }
    };

    recognition.onerror = (event) => {
      setListeningField(null);
      activeFieldRef.current = null;
      const messages = {
        "not-allowed": "Mic permission blocked. Allow the microphone for this site and in macOS Settings > Privacy & Security > Microphone.",
        "service-not-allowed": "Mic permission blocked. Allow the microphone for this site and in macOS Settings > Privacy & Security > Microphone.",
        "no-speech": "No speech heard. Try again, closer to the mic.",
        "audio-capture": "No microphone found on this device.",
        network: "Voice input needs internet and works in Google Chrome.",
      };
      toast.error(messages[event.error] || `Voice input error (${event.error}).`);
    };

    recognition.onend = () => {
      setListeningField(null);
      activeFieldRef.current = null;
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, []);

  const startListening = (field) => {
    try {
      processedRef.current = 0;
      activeFieldRef.current = field;
      setListeningField(field);
      recognitionRef.current.start();
      toast.success("Listening... speak now");
    } catch (err) {
      setListeningField(null);
      activeFieldRef.current = null;
      toast.error("Couldn't start the mic. Please try again.");
    }
  };

  const toggleListening = (field) => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported in this browser. Try Chrome.");
      return;
    }

    if (listeningField === field) {
      recognitionRef.current.stop();
      setListeningField(null);
      activeFieldRef.current = null;
      return;
    }

    if (listeningField) {
      recognitionRef.current.stop();
      setTimeout(() => startListening(field), 300);
      return;
    }

    startListening(field);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalText(event.target.result);
        toast.success(`Loaded "${file.name}"`);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf")) {
      const loadingToast = toast.loading("Extracting text from PDF...");
      try {
        const text = await extractTextFromPDF(file);
        if (!text) {
          toast.error("Couldn't extract text — this PDF might be scanned/image-based", { id: loadingToast });
        } else {
          setOriginalText(text);
          toast.success(`Loaded "${file.name}"`, { id: loadingToast });
        }
      } catch (err) {
        toast.error("Failed to read PDF", { id: loadingToast });
      }
    } else {
      toast.error("Only .txt and .pdf files are supported");
    }

    e.target.value = "";
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/notes", {
        title,
        originalText,
        summaryLength,
        tag,
        outputType,
      });
      setNotes([res.data, ...notes]);
      setTitle("");
      setOriginalText("");
      toast.success("Note created!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create note";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/notes/${id}`);
      setNotes(notes.filter((note) => note._id !== id));
      toast.success("Note deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (id) => {
    const note = notes.find((n) => n._id === id);
    if (!note) return;

    const newPinned = !note.pinned;

    setNotes(
      notes.map((n) => (n._id === id ? { ...n, pinned: newPinned } : n))
    );

    try {
      await API.patch(`/notes/${id}`, { pinned: newPinned });
    } catch (err) {
      toast.error("Failed to update pin status");
      setNotes(
        notes.map((n) => (n._id === id ? { ...n, pinned: !newPinned } : n))
      );
    }
  };

  const handleRegenerate = async (id) => {
    const res = await API.post(`/notes/${id}/regenerate`);
    setNotes(notes.map((n) => (n._id === id ? res.data : n)));
  };

  const handleRename = async (id, title) => {
    const res = await API.patch(`/notes/${id}`, { title });
    setNotes(notes.map((n) => (n._id === id ? res.data : n)));
  };

  const handleShowPinnedOnly = async () => {
    const turningOn = !showPinnedOnly;
    setShowPinnedOnly(turningOn);
    if (turningOn && page < totalPages) {
      await fetchNotes(totalPages, true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNotes = useMemo(() => {
    let result = notes.filter((n) =>
      n.title.toLowerCase().includes(search.toLowerCase())
    );
    if (filterTag !== "All") {
      result = result.filter((n) => (n.tag || "General") === filterTag);
    }
    if (filterOutputType !== "All") {
      result = result.filter((n) => (n.outputType || "summary") === filterOutputType);
    }
    if (showPinnedOnly) {
      result = result.filter((n) => n.pinned);
    }
    return result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [notes, search, filterTag, filterOutputType, showPinnedOnly]);

  const totalWordsSaved = useMemo(() => {
    return notes
      .filter((n) => (n.outputType || "summary") === "summary")
      .reduce((acc, n) => {
        const orig = (n.originalText || "").trim().split(/\s+/).length;
        const summ = (n.summary || "").trim().split(/\s+/).length;
        return acc + Math.max(orig - summ, 0);
      }, 0);
  }, [notes]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <Sparkles size={26} />
          <h1>AI Notes Summarizer</h1>
        </div>

        <div className="header-actions">
          <span>Hi, {user?.name}</span>
          <button className="icon-btn" onClick={() => navigate("/trash")} title="Trash">
            <Trash2 size={18} />
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-number">{notes.length}</div>
          <div className="stat-label">Total Notes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalWordsSaved}</div>
          <div className="stat-label">Words Saved</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{notes.filter((n) => n.pinned).length}</div>
          <div className="stat-label">Pinned</div>
        </div>
      </div>

      {showTip && notes.length === 0 && (
        <div className="onboarding-tip">
          <span>
            👋 Welcome! Paste any text below, pick a summary length, and hit "Create & Summarize" — AI will shorten it for you instantly.
          </span>
          <button onClick={dismissTip}>Got it</button>
        </div>
      )}

      <form onSubmit={handleCreateNote} className="note-form">
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <button
            type="button"
            className={`mic-btn mic-btn-input ${listeningField === "title" ? "listening" : ""}`}
            onClick={() => toggleListening("title")}
            title={listeningField === "title" ? "Stop recording" : "Speak title"}
          >
            {listeningField === "title" ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>

        <div className="textarea-wrapper">
          <textarea
            placeholder="Paste your notes here... (Cmd+Enter to submit)"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleCreateNote(e);
              }
            }}
            rows={5}
            required
          />
          <div className="textarea-btn-group">
            <label className="mic-btn upload-btn" title="Upload a .txt file or .pdf file">
              <Upload size={16} />
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              className={`mic-btn ${listeningField === "notes" ? "listening" : ""}`}
              onClick={() => toggleListening("notes")}
              title={listeningField === "notes" ? "Stop recording" : "Speak to add text"}
            >
              {listeningField === "notes" ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>

        <div className="length-selector">
          <span className="length-label">What do you want?</span>
          <div className="length-options">
            {[
              { key: "summary", label: "📝 Summary" },
              { key: "cheatsheet", label: "📋 Cheat Sheet" },
              { key: "roadmap", label: "🗺️ Roadmap" },
              { key: "diagram", label: "📊 Diagram" },
            ].map((opt) => (
              <button
                type="button"
                key={opt.key}
                className={`length-chip ${outputType === opt.key ? "active" : ""}`}
                onClick={() => setOutputType(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {outputType === "summary" && (
          <div className="length-selector">
            <span className="length-label">Summary length:</span>
            <div className="length-options">
              {["short", "medium", "detailed"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`length-chip ${summaryLength === option ? "active" : ""}`}
                  onClick={() => setSummaryLength(option)}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="length-selector">
          <span className="length-label">Category:</span>
          <div className="length-options">
            {TAGS.map((t) => (
              <button
                type="button"
                key={t}
                className={`length-chip ${tag === t ? "active" : ""}`}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading && <span className="spinner"></span>}
          {loading ? "Summarizing..." : "Create & Summarize"}
        </button>
      </form>

      {notes.length > 0 && (
        <>
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search notes by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-tags">
            {["All", ...TAGS].map((t) => (
              <button
                key={t}
                className={`filter-chip ${filterTag === t ? "active" : ""}`}
                onClick={() => setFilterTag(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="filter-tags">
            {[
              { key: "All", label: "All Types" },
              { key: "summary", label: "📝 Summary" },
              { key: "cheatsheet", label: "📋 Cheat Sheet" },
              { key: "roadmap", label: "🗺️ Roadmap" },
              { key: "diagram", label: "📊 Diagram" },
            ].map((opt) => (
              <button
                key={opt.key}
                className={`filter-chip ${filterOutputType === opt.key ? "active" : ""}`}
                onClick={() => setFilterOutputType(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="notes-list">
        {fetching ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>{search ? "No notes match your search" : "No notes yet. Create your first one above!"}</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <motion.div
                key={note._id}
                layout
                initial={{ opacity: 0, y: -15, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <NoteCard
                  note={note}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  onTogglePin={handleTogglePin}
                  onRegenerate={handleRegenerate}
                  onRename={handleRename}
                  onShowPinnedOnly={handleShowPinnedOnly}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!fetching && page < totalPages && (
        <button
          className="load-more-btn"
          onClick={() => fetchNotes(page + 1)}
        >
          Load More Notes
        </button>
      )}

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this note?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button className="modal-confirm" onClick={() => handleDelete(confirmDeleteId)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;