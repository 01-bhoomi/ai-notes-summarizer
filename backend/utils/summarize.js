const generateContent = require("./generateContent");

const MAX_CHARS = 10000; // keeps requests inside the free token limits

const lengthGuide = {
  short: {
    instruction: "in 1 to 2 short sentences (about 25 to 40 words)",
    tokens: 150,
  },
  medium: {
    instruction: "in one clear paragraph of about 60 to 90 words",
    tokens: 300,
  },
  detailed: {
    instruction:
      "in a detailed summary of about 150 to 220 words, using a short paragraph or a few bullet points so every key point is covered",
    tokens: 600,
  },
};

const summarizeText = async (text, length = "medium") => {
  const guide = lengthGuide[length] || lengthGuide.medium;
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

  const prompt = `Summarize the following text ${guide.instruction}.

Rules:
- Use only information that is in the text. Do not add new facts.
- Write the summary in the same language as the text.
- If the text is already very short, just restate it briefly.
- Output only the summary, with no introduction like "Here is the summary".

Text:
${trimmed}`;

  return generateContent(prompt, guide.tokens);
};

module.exports = summarizeText;