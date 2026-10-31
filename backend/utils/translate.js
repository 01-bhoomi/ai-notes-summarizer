const axios = require("axios");

const translateToEnglish = async (text) => {
  try {
    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/Helsinki-NLP/opus-mt-hi-en",
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
      }
    );

    return response.data[0].translation_text;
  } catch (error) {
    console.error("Translation error:", error.response?.data || error.message);
    // If translation fails, just return original text so the app doesn't break
    return text;
  }
};

module.exports = translateToEnglish;