import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST requests are allowed" });
  }

  try {
    const { prompt } = req.body;

    const filePath = path.join(process.cwd(), "static-data", "HASP.txt");
    const fileContent = await fs.readFile(filePath, "utf-8");

    const inputText = `Here is the HASP CMS information:\n${fileContent}\n\nQ: ${
      prompt || "Please provide question about HASP CMS."
    }`;

    // List of models supported on my API KEY link https://generativelanguage.googleapis.com/v1/models?key=AIzaSyDUqykkTZ21phmWkZm5ER1mlfjAVS5Td0E

    // console.log(inputText,"testa");

    const apiKey = process.env.NEXT_PUBLIC_AI_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: inputText }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    // console.log("Raw Gemini response:", JSON.stringify(data, null, 2));

    if (data.candidates && data.candidates.length > 0) {
      res.status(200).json({
        message: data.candidates[0].content.parts[0].text,
      });
    } else {
      res.status(200).json({ message: "No response from Gemini." });
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ message: error.message });
  }
}
