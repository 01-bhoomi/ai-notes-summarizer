import { Trash2, Copy, Pin, Calendar, FileText, Check, Tag, MessageCircle, Send, Download, RefreshCw, Pencil, Share2, X, MoreVertical } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import mermaid from "mermaid";
import html2canvas from "html2canvas";
import API from "../api/axios";
import remarkGfm from "remark-gfm";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  suppressErrorRendering: true,
});

const NoteCard = ({ note, onDelete, onTogglePin, onRegenerate, onRename, onShowPinnedOnly }) => {
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [diagramError, setDiagramError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(note.title);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const diagramRef = useRef(null);
  const cheatSheetRef = useRef(null);
  const chatEndRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (note.outputType !== "diagram" || !diagramRef.current) return;

    let cancelled = false;
    const renderId = `mermaid-${note._id}-${Date.now()}`;

    const renderDiagram = async () => {
      try {
        const code = note.summary
          .replace(/```mermaid/gi, "")
          .replace(/```/g, "")
          .trim();

        await mermaid.parse(code);
        const { svg } = await mermaid.render(renderId, code);

        if (!cancelled && diagramRef.current) {
          diagramRef.current.innerHTML = svg;
          setDiagramError(false);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        const leftover = document.getElementById(`d${renderId}`);
        if (leftover) leftover.remove();
        if (!cancelled) setDiagramError(true);
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [note.outputType, note.summary, note._id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatHistory, asking]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.summary);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    setMenuOpen(false);
    const shareText = `${note.title}\n\n${note.summary}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: note.title, text: shareText });
      } catch (err) {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard! Paste it anywhere to share.");
    }
  };

  const handleDownloadCheatSheet = async () => {
    if (!cheatSheetRef.current) return;
    try {
      const canvas = await html2canvas(cheatSheetRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `${note.title.replace(/\s+/g, "_")}_cheatsheet.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Cheat sheet downloaded!");
    } catch (err) {
      toast.error("Failed to download cheat sheet");
    }
  };

    const handleDownloadDiagram = () => {
    const svgEl = diagramRef.current?.querySelector("svg");
    if (!svgEl) return;

    const fileBase = note.title.replace(/\s+/g, "_");
    const rect = svgEl.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);

    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    const svgText = new XMLSerializer().serializeToString(clone);

    const downloadSvg = () => {
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.download = `${fileBase}_diagram.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Diagram downloaded as SVG!");
    };

    const img = new Image();
    img.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const link = document.createElement("a");
        link.download = `${fileBase}_diagram.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("Diagram downloaded!");
      } catch (err) {
        downloadSvg();
      }
    };
    img.onerror = downloadSvg;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate(note._id);
      toast.success("Regenerated!");
    } catch (err) {
      toast.error("Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || newTitle.trim() === note.title) {
      setIsRenaming(false);
      setNewTitle(note.title);
      return;
    }

    setRenaming(true);
    try {
      await onRename(note._id, newTitle.trim());
      toast.success("Renamed!");
      setIsRenaming(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to rename");
      setNewTitle(note.title);
    } finally {
      setRenaming(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const currentQuestion = question;
    setQuestion("");
    setAsking(true);

    try {
      const res = await API.post(`/notes/${note._id}/ask`, {
        question: currentQuestion,
        history: chatHistory.slice(-6),
      });
      setChatHistory((prev) => [...prev, { question: currentQuestion, answer: res.data.answer }]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't get an answer. Please try again.");    
    } finally {
      setAsking(false);
    }
  };

  const originalWords = note.originalText.trim().split(/\s+/).filter(Boolean).length;
  const summaryWords = note.summary.trim().split(/\s+/).filter(Boolean).length;
  const reduction = originalWords > 0
    ? Math.max(0, Math.round(((originalWords - summaryWords) / originalWords) * 100))
    : 0;

  const outputTypeLabels = {
    summary: "📝 Summary",
    cheatsheet: "📋 Cheat Sheet",
    roadmap: "🗺️ Roadmap",
    diagram: "📊 Diagram",
  };

  const canRegenerate = note.outputType !== "summary";

  return (
    <div className="note-card">
      <div className="note-card-header">
        <div className="note-title-group">
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="rename-form">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                disabled={renaming}
              />
              <button type="submit" disabled={renaming} title="Save">
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRenaming(false);
                  setNewTitle(note.title);
                }}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <h3>{note.title}</h3>
          )}
          <span className="length-badge">
            {outputTypeLabels[note.outputType] || "📝 Summary"}
          </span>
          {note.outputType === "summary" && (
            <span className="length-badge">{note.summaryLength || "medium"}</span>
          )}
          <span className="tag-badge">
            <Tag size={10} /> {note.tag || "General"}
          </span>
        </div>

        <div className="note-header-icons">
          <button
            className={`pin-btn ${note.pinned ? "pinned" : ""}`}
            onClick={() => onTogglePin(note._id)}
            title="Pin note"
          >
            <Pin size={18} fill={note.pinned ? "currentColor" : "none"} />
          </button>

          <div className="note-actions-menu" ref={menuRef}>
            <button
              className="action-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="More options"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setIsRenaming(true);
                    setMenuOpen(false);
                  }}
                >
                  <Pencil size={14} /> Rename
                </button>
                <button
                  onClick={() => {
                    setShowChat(!showChat);
                    setMenuOpen(false);
                  }}
                >
                  <MessageCircle size={14} /> {showChat ? "Hide Chat" : "Chat"}
                </button>
                <button onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} Copy Summary
                </button>
                <button onClick={handleShare}>
                  <Share2 size={14} /> Share
                </button>
                <button
                  onClick={() => {
                    onShowPinnedOnly();
                    setMenuOpen(false);
                  }}
                >
                  <Pin size={14} /> Pinned Notes
                </button>
                <button
                  className="dropdown-delete"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(note._id);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {note.outputType === "diagram" ? (
        <div className="diagram-container">
          {diagramError ? (
            <p className="error">
              Couldn't render this diagram. Try regenerating it.
            </p>
          ) : (
            <div ref={diagramRef} className="mermaid-diagram"></div>
          )}
        </div>
      ) : note.outputType === "cheatsheet" ? (
        <div>
          <div ref={cheatSheetRef} className="cheatsheet-card">
            <h4>{note.title}</h4>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.summary}</ReactMarkdown>
            </div>
          </div>
          <button className="download-cheatsheet-btn" onClick={handleDownloadCheatSheet}>
            <Download size={14} /> Download as Image
          </button>
        </div>
      ) : (
        <div className="note-summary markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.summary}</ReactMarkdown>
        </div>
      )}

      {canRegenerate && (
        <button
          className="regenerate-btn"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          <RefreshCw size={13} className={regenerating ? "spin-icon" : ""} />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      )}

      <div className="note-meta">
        {note.outputType === "summary" && (
          <span>
            <FileText size={13} /> {reduction}% shorter
          </span>
        )}
        <span>
          <Calendar size={13} /> {new Date(note.createdAt).toLocaleDateString()}
        </span>
      </div>

      <details>
        <summary>Original Text</summary>
        <div className="markdown-body" style={{ marginTop: 6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.originalText}</ReactMarkdown>
        </div>
      </details>

      {showChat && (
        <div className="chat-box">
          {chatHistory.length === 0 && !asking && (
            <p className="chat-hint">
              Ask anything: "explain with an example", "give interview questions",
              "explain in simple Hindi", "explain this code"...
            </p>
          )}

          {(chatHistory.length > 0 || asking) && (
            <div className="chat-history">
              {chatHistory.map((item, idx) => (
                <div key={idx} className="chat-item">
                  <p className="chat-question">You: {item.question}</p>
                  <div className="chat-answer markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {asking && (
                <div className="chat-item">
                  <p className="chat-thinking">Thinking...</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          <form onSubmit={handleAsk} className="chat-input-row">
            <input
              type="text"
              placeholder="Ask anything about this note..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking}
            />
            <button type="submit" disabled={asking || !question.trim()}>
              {asking ? <span className="spinner"></span> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}

      <div className="note-footer">
        <span className="note-date">{summaryWords} words</span>
      </div>
    </div>
  );
};

export default NoteCard;