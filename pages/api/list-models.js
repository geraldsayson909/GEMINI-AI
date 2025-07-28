import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_AI_KEY);

  try {
    const models = await genAI.listModels();
    console.log("Available Models:", models);
    return res.status(200).json({ models });
  } catch (err) {
    console.error("Failed to list models:", err);
    return res.status(500).json({ message: err.message });
  }
}