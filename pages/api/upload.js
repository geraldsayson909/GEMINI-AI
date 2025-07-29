import { IncomingForm } from "formidable";
import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

function isDocx(filename) {
  return filename.toLowerCase().endsWith(".docx");
}

function htmlToText(html) {
  let text = html
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, "")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/gi, "");
  text = text.replace(/\n{2,}/g, "\n").trim();
  return text;
}

// Split pages by "Page: ..." (returns array of {title, content})
function splitPages(content) {
  const regex = /Page:\s*(.+?)\n([\s\S]*?)(?=(?:\nPage:|$))/g;
  const result = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    result.push({
      title: match[1].trim(),
      content: match[2].trim()
    });
  }
  return result;
}

// Utility: Trim description to max 160 chars, ending at sentence or word
function trimMetaDescription(text, maxLength = 160) {
  if (text.length <= maxLength) return text;
  const sentenceEnd = Math.max(
    text.lastIndexOf('.', maxLength),
    text.lastIndexOf('!', maxLength),
    text.lastIndexOf('?', maxLength)
  );
  if (sentenceEnd > 0) return text.slice(0, sentenceEnd + 1).trim();
  const wordEnd = text.lastIndexOf(' ', maxLength);
  return (wordEnd > 0 ? text.slice(0, wordEnd) : text.slice(0, maxLength)).trim();
}

// Utility: Trim keywords to max 255 chars, ending at comma
function trimMetaKeywords(keywords, minLength = 150, maxLength = 255) {
  if (keywords.length <= maxLength) return keywords;
  const commaEnd = keywords.lastIndexOf(',', maxLength);
  if (commaEnd > minLength) return keywords.slice(0, commaEnd).trim();
  return keywords.slice(0, maxLength).trim();
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

      // STEP 2: Split pages
      const pages = splitPages(fileContent);
      if (pages.length === 0) {
        return res.status(400).json({ message: "No pages found in document." });
      }

      const apiKey = process.env.NEXT_PUBLIC_AI_KEY;
      const createdPages = [];

      // STEP 3: Process each page
      for (const pg of pages) {
        const prompt = `Read the content below. The title of this page is "${pg.title}". Your task is to return a JSON object with:
- "name": the page title,
- "url": a clean lowercase URL slug starting with "/" (from the title),
- "keywords": meta keywords (150–255 characters, comma-separated, based on the content),
- "description": meta description (max 160 letters, based on the content).
Content:
${pg.content}`;

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
          const match = aiText.match(/{[^}]+}/s);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch (inner) {
              console.error("Bad JSON inside match:", match[0]);
              continue;
            }
          } else {
            continue;
          }
        }

        let { name, url, keywords, description } = parsed;
        if (!name || !url || !keywords || !description) {
          continue;
        }

        // Enforce keyword/description limits, avoid cutting sentences/words
        keywords = trimMetaKeywords(keywords);
        description = trimMetaDescription(description);

        // STEP 4: Create the page using that info
        const postRes = await fetch("http://localhost:3000/api/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            url,
            keywords,
            description,
            content: pg.content,
          }),
        });

        const pageData = await postRes.json();
        createdPages.push({
          name, url, keywords, description, aiText, pageData
        });
      }

      return res.status(200).json({
        message: `${createdPages.length} pages created.`,
        createdPages,
      });
    } catch (error) {
      console.error("Upload handler error:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  });
}