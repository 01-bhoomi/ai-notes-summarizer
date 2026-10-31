const generateContent = require("./generateContent");

const typeLabels = {
  summary: "a summary",
  cheatsheet: "a cheat sheet",
  roadmap: "a roadmap",
  diagram: "a flowchart diagram",
};

const chatWithNote = async (note, question, history = []) => {
  const noteType = typeLabels[note.outputType] || "a summary";

  const systemPrompt = `You are a friendly, expert assistant inside a notes app. The user has a note titled "${note.title}". Below is the user's original text and the AI-generated ${noteType} made from it.

ORIGINAL TEXT:
${note.originalText.slice(0, 6000)}

GENERATED OUTPUT:
${note.summary.slice(0, 3000)}

How to answer:
- Answer ANY follow-up question the user asks. Use the note as context, but you may also use your general knowledge to explain topics, give examples, list important interview questions, or explain code.
- Follow the format and tone the user asks for (bullet points, paragraph, professional, simple language, step by step, etc.).
- Reply in the same language the user writes in (English, Hindi, or Hinglish).
- Use Markdown for lists and code blocks.
- Be accurate. If you are not sure about something, say so honestly.
- Keep answers focused and reasonably concise.`;

  const messages = [{ role: "system", content: systemPrompt }];

  history.forEach((item) => {
    if (item && item.question && item.answer) {
      messages.push({ role: "user", content: String(item.question).slice(0, 1000) });
      messages.push({ role: "assistant", content: String(item.answer).slice(0, 2000) });
    }
  });

  messages.push({ role: "user", content: question });

  return generateContent(messages, 1500);
};

module.exports = chatWithNote;