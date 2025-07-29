import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed." });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required." });
    }

    const filePath = path.join(process.cwd(), "static-data", "parsed.txt");
    const fileContent = await fs.readFile(filePath, "utf-8");

    const inputText = `Here is the HASP CMS information:\n${fileContent}\n\nQ: ${prompt}`;

    const apiKey = process.env.NEXT_PUBLIC_AI_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputText }] }],
        }),
      }
    );

    const data = await response.json();

    if (data.candidates?.length) {
      return res.status(200).json({
        message: data.candidates[0].content.parts[0].text,
      });
    } else {
      return res.status(200).json({ message: "No response from Gemini." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
