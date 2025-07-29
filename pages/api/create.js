import fs from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "static-data/pages.json");

// Helper: read all pages
async function readPages() {
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper: save all pages
async function savePages(pages) {
  await fs.writeFile(DATA_PATH, JSON.stringify(pages, null, 2), "utf-8");
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Optionally filter by name, url, or id
    const { id, name, url } = req.query;
    const pages = await readPages();

    if (id) {
      const page = pages.find((p) => p.id === id);
      if (!page) return res.status(404).json({ message: "Page not found." });
      return res.status(200).json(page);
    }
    if (name) {
      const page = pages.find((p) => p.name === name);
      if (!page) return res.status(404).json({ message: "Page not found." });
      return res.status(200).json(page);
    }
    if (url) {
      const page = pages.find((p) => p.url === url);
      if (!page) return res.status(404).json({ message: "Page not found." });
      return res.status(200).json(page);
    }

    // No filter: return all pages
    return res.status(200).json(pages);
  }

  if (req.method === "POST") {
    const { name, url, keywords, description , content } = req.body;
    if (!name || !url || !keywords || !description || !content) {
      return res.status(400).json({ message: "Missing fields." });
    }

    const pages = await readPages();
    const id = `${Date.now()}`; // unique id (timestamp)
    const newPage = { id, name, url, keywords, description, content };
    pages.push(newPage);
    await savePages(pages);

    return res.status(201).json(newPage);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}