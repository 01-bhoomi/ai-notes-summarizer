const axios = require("axios");

const BASE = "https://api.groq.com/openai/v1";
const CHAT_URL = `${BASE}/chat/completions`;

// Preference order. Only models your key can actually use are tried.
const PREFERRED = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  "Content-Type": "application/json",
});

let cache = { models: null, at: 0 };

const getCandidateModels = async () => {
  if (cache.models && Date.now() - cache.at < 10 * 60 * 1000) return cache.models;
  try {
    const res = await axios.get(`${BASE}/models`, { headers: authHeaders(), timeout: 15000 });
    const available = (res.data.data || []).map((m) => m.id);
    let list = PREFERRED.filter((id) => available.includes(id));
    if (list.length === 0) {
      // fallback: any chat-capable model
      list = available.filter((id) => !/whisper|guard|tts|orpheus|embed/i.test(id));
    }
    if (list.length) {
      cache = { models: list, at: Date.now() };
      return list;
    }
  } catch (e) {
    console.error("Could not list models:", e.response?.status, e.response?.data || e.message);
  }
  return PREFERRED; // last resort
};

const generateContent = async (promptOrMessages, maxTokens = 700) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("AI service is not configured (missing GROQ_API_KEY).");
  }

  const messages =
    typeof promptOrMessages === "string"
      ? [{ role: "user", content: promptOrMessages }]
      : promptOrMessages;

  const models = await getCandidateModels();
  let lastError = null;

  for (const model of models) {
    const isReasoning = model.startsWith("openai/gpt-oss");
    const body = {
      model,
      messages,
      temperature: 0.5,
      // reasoning models spend tokens on thinking, so give extra room
      max_tokens: isReasoning ? maxTokens + 1500 : maxTokens,
    };
    if (isReasoning) body.reasoning_effort = "low";

    try {
      const response = await axios.post(CHAT_URL, body, {
        headers: authHeaders(),
        timeout: 60000,
      });
      const msg = response.data.choices?.[0]?.message;
      const text = (msg?.content || "").trim() || (msg?.reasoning || "").trim();
      if (!text) throw new Error("Empty response from model");
      return text;
    } catch (error) {
      lastError = error;
      console.error(
        `Model ${model} failed [${error.response?.status || "no-status"}]:`,
        error.response?.data?.error?.message || error.message
      );
      if (error.response?.status === 401) break;
    }
  }

  const status = lastError?.response?.status;
  if (status === 401) throw new Error("AI service key is invalid. Please check GROQ_API_KEY.");
  if (status === 429) throw new Error("AI is busy right now (free limit reached). Please try again in a minute.");
  throw new Error("AI service is temporarily unavailable. Please try again.");
};

module.exports = generateContent;