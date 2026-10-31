import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Trash2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api/axios";

const Trash = () => {
  const [trashedNotes, setTrashedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmPermanentId, setConfirmPermanentId] = useState(null);
  const navigate = useNavigate();

  const fetchTrash = async () => {
    try {
      const res = await API.get("/notes/trash");
      setTrashedNotes(res.data);
    } catch (err) {
      toast.error("Failed to load trash");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id) => {
    try {
      await API.patch(`/notes/${id}/restore`);
      setTrashedNotes(trashedNotes.filter((n) => n._id !== id));
      toast.success("Note restored!");
    } catch (err) {
      toast.error("Failed to restore note");
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      await API.delete(`/notes/${id}/permanent`);
      setTrashedNotes(trashedNotes.filter((n) => n._id !== id));
      toast.success("Note permanently deleted");
      setConfirmPermanentId(null);
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  const daysLeft = (deletedAt) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <button className="icon-btn" onClick={() => navigate("/dashboard")} title="Back">
            <ArrowLeft size={18} />
          </button>
          <Sparkles size={26} />
          <h1>Trash</h1>
        </div>
      </header>

      <p className="trash-info">
        Notes here are automatically deleted forever after 30 days.
      </p>

      <div className="notes-list">
        {loading ? (
          <p>Loading trash...</p>
        ) : trashedNotes.length === 0 ? (
          <div className="empty-state">
            <Trash2 size={48} />
            <p>Trash is empty</p>
          </div>
        ) : (
          trashedNotes.map((note) => (
            <div key={note._id} className="note-card trashed">
              <div className="note-card-header">
                <h3>{note.title}</h3>
              </div>
              <p className="note-summary">{note.summary}</p>
              <div className="note-meta">
                <span>{daysLeft(note.deletedAt)} days left before permanent deletion</span>
              </div>
              <div className="note-footer">
                <span className="note-date">
                  Deleted on {new Date(note.deletedAt).toLocaleDateString()}
                </span>
                <div className="note-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleRestore(note._id)}
                    title="Restore note"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => setConfirmPermanentId(note._id)}
                    title="Delete forever"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmPermanentId && (
        <div className="modal-overlay" onClick={() => setConfirmPermanentId(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete forever?</h3>
            <p>This note will be permanently deleted and cannot be recovered.</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setConfirmPermanentId(null)}>
                Cancel
              </button>
              <button
                className="modal-confirm"
                onClick={() => handlePermanentDelete(confirmPermanentId)}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;