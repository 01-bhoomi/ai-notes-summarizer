const Note = require("../models/Note");
const summarizeText = require("../utils/summarize");
const generateContent = require("../utils/generateContent");
const chatWithNote = require("../utils/chatWithNote");
const xss = require("xss");

const buildPrompt = (outputType, text) => {
  if (outputType === "cheatsheet") {
    return `Create a concise cheat sheet from the following text. Use short headings and bullet points covering the most important facts and concepts. Keep it compact and scannable.\n\nText:\n${text}\n\nCheat Sheet:`;
  }
  if (outputType === "roadmap") {
    return `Create a clear, numbered step-by-step roadmap/learning path based on the following text. Each step should have a short title and one-line description.\n\nText:\n${text}\n\nRoadmap:`;
  }
  if (outputType === "diagram") {
    return `Convert the following text into a valid Mermaid.js flowchart diagram.

STRICT RULES:
- Start with exactly: flowchart TD
- Use simple node IDs like A, B, C, D (single letters, no spaces)
- Node labels go in square brackets like A[Label Text]
- Do NOT use special characters like (), :, ', ", or line breaks inside labels
- Keep labels short (max 4-5 words)
- Use only --> for connections, no labels on arrows
- Respond with ONLY the Mermaid code, nothing else. No explanations, no markdown code fences, no backticks.

Text:
${text}

Mermaid code:`;
  }
  return null;
};

const cleanMermaidCode = (raw) => {
  let code = raw.replace(/```mermaid/gi, "").replace(/```/g, "").trim();

  const lines = code.split("\n");
  const startIdx = lines.findIndex((l) =>
    /^\s*(flowchart|graph)\s+(TD|TB|LR|RL|BT)/i.test(l)
  );

  if (startIdx === -1) {
    throw new Error("AI did not return a valid diagram. Please try again.");
  }

  const kept = lines.slice(startIdx).filter((line, i) => {
    if (i === 0) return true;
    return /-->|---/.test(line) || /^\s*\w+\s*\[.*\]\s*$/.test(line);
  });

  code = kept.join("\n");
  code = code.replace(/\|[^|\n]*\|/g, "");
  code = code.replace(/([^-=<])->/g, "$1-->");

  code = code.replace(/\[([^\]\n]*)\]/g, (match, label) => {
    const safe = label
      .replace(/["'`()\[\]{}:;#&<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `["${safe}"]`;
  });

  return code;
};

const createNote = async (req, res) => {
  try {
    let { title, originalText, tag, summaryLength, outputType } = req.body;

    if (!title || !originalText) {
      return res.status(400).json({ message: "Title and text are required" });
    }

    title = xss(title.trim());
    originalText = xss(originalText.trim());
    outputType = outputType || "summary";

    const existing = await Note.findOne({
      user: req.userId,
      title: { $regex: `^${title}$`, $options: "i" },
      isDeleted: false,
    });

    if (existing) {
      return res.status(400).json({ message: "A note with this title already exists" });
    }

    let summary;

    if (outputType === "summary") {
      summary = await summarizeText(originalText, summaryLength || "medium");
    } else {
      const prompt = buildPrompt(outputType, originalText);
      const generated = await generateContent(prompt);
      summary = outputType === "diagram" ? cleanMermaidCode(generated) : generated;
    }

    const note = await Note.create({
      user: req.userId,
      title,
      originalText,
      summary,
      tag: tag || "General",
      summaryLength: summaryLength || "medium",
      outputType,
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: req.userId, isDeleted: false };

    const totalNotes = await Note.countDocuments(filter);
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      notes,
      currentPage: page,
      totalPages: Math.ceil(totalNotes / limit),
      totalNotes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrashedNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.userId, isDeleted: true }).sort({
      deletedAt: -1,
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const { title, tag, pinned } = req.body;

    if (title !== undefined) {
      const cleanTitle = xss(title.trim());
      if (!cleanTitle) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }

      const duplicate = await Note.findOne({
        _id: { $ne: note._id },
        user: req.userId,
        title: { $regex: `^${cleanTitle}$`, $options: "i" },
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(400).json({ message: "A note with this title already exists" });
      }

      note.title = cleanTitle;
    }

    if (tag !== undefined) note.tag = tag;
    if (pinned !== undefined) note.pinned = pinned;

    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId });
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }
    note.isDeleted = true;
    note.deletedAt = new Date();
    await note.save();
    res.json({ message: "Note moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId, isDeleted: true });
    if (!note) {
      return res.status(404).json({ message: "Note not found in trash" });
    }
    note.isDeleted = false;
    note.deletedAt = null;
    await note.save();
    res.json({ message: "Note restored", note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const permanentDeleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId, isDeleted: true });
    if (!note) {
      return res.status(404).json({ message: "Note not found in trash" });
    }
    await note.deleteOne();
    res.json({ message: "Note permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const askNoteQuestion = async (req, res) => {
  try {
    let { question, history } = req.body;
    const note = await Note.findOne({ _id: req.params.id, user: req.userId });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    question = question.trim().slice(0, 1000);
    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];

    const answer = await chatWithNote(note, question, safeHistory);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const regenerateNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.userId });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    let summary;

    if (note.outputType === "summary") {
      summary = await summarizeText(note.originalText, note.summaryLength || "medium");
    } else {
      const prompt = buildPrompt(note.outputType, note.originalText);
      const generated = await generateContent(prompt);
      summary = note.outputType === "diagram" ? cleanMermaidCode(generated) : generated;
    }

    note.summary = summary;
    await note.save();

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNote,
  getNotes,
  getTrashedNotes,
  updateNote,
  deleteNote,
  restoreNote,
  permanentDeleteNote,
  askNoteQuestion,
  regenerateNote,
};