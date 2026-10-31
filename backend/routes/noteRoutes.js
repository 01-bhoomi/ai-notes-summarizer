const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  createNote,
  getNotes,
  getTrashedNotes,
  updateNote,
  deleteNote,
  restoreNote,
  permanentDeleteNote,
  askNoteQuestion,
  regenerateNote,
} = require("../controllers/noteController");

const router = express.Router();

router.use(protect);

router.post("/", createNote);
router.get("/", getNotes);
router.get("/trash", getTrashedNotes);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/restore", restoreNote);
router.delete("/:id/permanent", permanentDeleteNote);
router.post("/:id/ask", askNoteQuestion);
router.post("/:id/regenerate", regenerateNote);

module.exports = router;