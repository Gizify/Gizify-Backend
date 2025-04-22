require("dotenv").config();
const axios = require("axios");

const generateRecipe = async (req, res) => {
  const { ingredients, difficulty, cuisine } = req.body;

  if (!ingredients || !difficulty || !cuisine) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const prompt = `
Saya ingin membuat resep makanan dari bahan berikut: ${ingredients.join(", ")}.
Tingkat kesulitan: ${difficulty}.
Jenis masakan: ${cuisine}.

Tolong balas dalam format JSON seperti berikut:

{
  "bahan": ["..."],
  "langkah": ["..."],
  "gizi": {
    "kalori": "...",
    "protein": "...",
    "lemak": "...",
    "gula": "...",
    "garam": "...",
    "serat": "..."
  }
}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiRaw = response.data.choices[0].message.content;

    const jsonStart = aiRaw.indexOf("{");
    const jsonEnd = aiRaw.lastIndexOf("}");
    const jsonString = aiRaw.slice(jsonStart, jsonEnd + 1);

    const parsedResult = JSON.parse(jsonString);

    res.json({ result: parsedResult });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate recipe" });
  }
};

module.exports = { generateRecipe };
