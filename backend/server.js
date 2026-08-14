import express from "express";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const { message, mode, character } = req.body;

    let systemPrompt = "";

    // 🧘 Guidance Mode
    if (mode === "guidance") {
      systemPrompt = `
      You are ${character}, a wise guide.

      Speak calmly, philosophically, and respectfully.
      Use analogies when helpful.
      Do not claim divine authority.
      `;
        }

      // 📖 Knowledge Mode
      if (mode === "knowledge") {
        systemPrompt = `
          You are an expert in Hindu epics.

          Answer clearly and factually.
          Do not hallucinate or invent facts.
          `;
        }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});