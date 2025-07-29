import { IncomingForm } from "formidable";
import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import mammoth from "mammoth";

export const config = {
  api: {
    bodyParser: false,
  },
};

function isDocx(filename) {
  return filename.toLowerCase().endsWith(".docx");
}

// Helper to convert HTML from Mammoth to text, preserving block tags as newlines
function htmlToText(html) {
  // Replace block tags with newlines
  let text = html
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, "")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/gi, ""); // Remove all other tags
  // Remove excessive newlines
  text = text.replace(/\n{2,}/g, "\n").trim();
  return text;
}

export default function handler(req, res) {
  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ message: "Upload failed" });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || !isDocx(file.originalFilename)) {
      return res.status(400).json({ message: "Only .docx files are supported." });
    }

    try {
      // STEP 1: Extract .docx content as HTML
      const buffer = await fs.readFile(file.filepath);
      const result = await mammoth.convertToHtml({ buffer });
      let fileContent = htmlToText(result.value);

      // Save to parsed.txt (optional)
      const staticDir = path.join(process.cwd(), "static-data");
      if (!fssync.existsSync(staticDir)) await fs.mkdir(staticDir);
      await fs.writeFile(path.join(staticDir, "parsed.txt"), fileContent);

      // STEP 2: Ask Gemini to extract Page Name and URL
      const prompt = `Read the content below. It contains a line like "Page: <Title>". Your task is to extract the page title and return it as "name", and generate a clean lowercase URL slug starting with "/" as "url", and make a meta keywords limit of 150–255 characters display on the keywords, and meta description limit of 160 letters display on the description based on the content has been gathered.
      Content:
      ${fileContent}`;

      const apiKey = process.env.NEXT_PUBLIC_AI_KEY;
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await geminiRes.json();

      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let parsed;
      try {
        parsed = JSON.parse(aiText);
      } catch (e) {
        // fallback to extract only JSON part
        const match = aiText.match(/{[^}]+}/s);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (inner) {
            console.error("Bad JSON inside match:", match[0]);
            return res.status(500).json({ message: "AI returned invalid JSON." });
          }
        } else {
          return res.status(500).json({ message: "AI returned no JSON block." });
        }
      }

      const { name, url, keywords , description } = parsed;

      if (!name || !url || !keywords || !description) {
        return res.status(500).json({ message: "AI did not return name and URL, meta keywords, meta description." });
      }

      // STEP 3: Create the page using that info
      const postRes = await fetch("http://localhost:3000/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          keywords,
          description,
          content: fileContent,
        }),
      });

      const pageData = await postRes.json();

      return res.status(200).json({
        message: "File uploaded, AI processed, page created.",
        page: { name, url },
        aiText,
        pageData,
      });
    } catch (error) {
      console.error("Upload handler error:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });
}