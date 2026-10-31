const axios = require("axios");

const askQuestion = async (question, context) => {
  try {
    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/deepset/roberta-base-squad2",
      {
        inputs: {
          question,
          context,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
      }
    );

    return response.data.answer;
  } catch (error) {
    console.error("Q&A error:", error.response?.data || error.message);
    throw new Error("Failed to answer question");
  }
};

module.exports = askQuestion;