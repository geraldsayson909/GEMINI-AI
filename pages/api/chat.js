import { buildContext } from "@/lib/buildContext";
import { projects } from "@/constants/projects";
import { skills } from "@/constants/skills";
import { experiences } from "@/constants/experience";
import { about } from "@/constants/about";

/* =========================
   HELPERS
========================= */

function normalizeText(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupeSentences(text = "") {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

  const seen = new Set();
  const result = [];

  for (const sentence of sentences) {
    const normalized = normalizeText(sentence);

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(sentence);
    }
  }

  return result.join(" ");
}

function dedupePhrases(text = "") {
  const patterns = [
    /\b5\+ years( of experience)?\b/gi,
    /\bfrontend development\b/gi,
    /\bexperience in\b/gi,
  ];

  const seen = new Set();

  let output = text;

  for (const pattern of patterns) {
    output = output.replace(pattern, (match) => {
      const key = normalizeText(match);

      if (seen.has(key)) return "";
      seen.add(key);
      return match;
    });
  }

  return output.replace(/\s+/g, " ").trim();
}

function cleanContent(text = "") {
  let result = text;

  result = dedupeSentences(result);
  result = dedupePhrases(result);

  return result;
}

const toLower = (str = "") => str.toLowerCase().trim();

const includesAny = (text, keywords = []) =>
  keywords.some((k) => text.includes(k));

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function cleanAIResponse(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/* =========================
   FORMAT LAYER (AI STYLE)
========================= */

function formatAbout(data) {
  if (!data) return "";

  const intros = [
    "Here’s a quick overview:",
    "A bit about him:",
    "Profile summary:",
    "Gerald J. Sayson is a Frontend Developer",
    "",
  ];

  return randomFrom(intros) + "\n\n" + cleanContent(data.description);
}

function formatSkills(data) {
  if (!data) return "";

  const flatSkills = data.flatMap((group) => group.skills).join(", ");

  const intros = [
    "He has experience with the following technologies:",
    "His tech stack includes:",
    "Here are his technical skills:",
    "He works with these tools and frameworks:",
  ];

  return `${randomFrom(intros)}\n\n${flatSkills}`;
}

function formatChat(message) {
  const prefixes = ["", "Got it —", "Sure —", "Here’s what you need:"];

  const raw = `${randomFrom(prefixes)} ${message}`;

  return cleanContent(raw);
}

/* =========================
   SMALL TALK
========================= */

function handleSmallTalk(prompt) {
  const lower = toLower(prompt);

  const smallTalk = ["thank you", "thanks", "ok", "okay", "cool", "nice", "👍"];

  if (smallTalk.includes(lower)) {
    return {
      type: "chat",
      message:
        "You're welcome! Let me know if you need more info about his portfolio.",
    };
  }

  return null;
}

/* =========================
   LINK REQUEST
========================= */

function handleLinkRequest(prompt) {
  const lower = toLower(prompt);

  if (includesAny(lower, ["link", "url", "open it", "visit", "provide link"])) {
    const featured = projects.find((p) => p.featured);

    return {
      type: "project",
      title: featured?.title,
      url: featured?.link,
      description: featured?.description,
      techStack: featured?.techStack || [],
    };
  }

  return null;
}

/* =========================
   ABOUT
========================= */

function handleAbout(prompt) {
  const lower = toLower(prompt);

  const isAbout =
    lower.includes("who is") ||
    lower.includes("about") ||
    lower.includes("tell me about") ||
    lower.includes("describe");

  if (!isAbout) return null;

  return {
    type: "chat",
    message: formatAbout(about),
  };
}

/* =========================
   RESUME
========================= */

function handleResumeRequest(prompt) {
  const lower = toLower(prompt);

  if (
    includesAny(lower, ["resume", "cv", "curriculum vitae", "download resume"])
  ) {
    return { type: "resume" };
  }

  return null;
}

/* =========================
   PROJECTS
========================= */

function handleAllProjects(prompt) {
  const lower = toLower(prompt);

  const isProjectContext = includesAny(lower, [
    "project",
    "projects",
    "built",
    "developed",
    "created",
    "made",
  ]);

  const isListIntent = includesAny(lower, [
    "what are",
    "list",
    "show",
    "tell me",
    "which",
    "details",
    "projects",
  ]);

  if (!(isProjectContext && isListIntent)) return null;

  return {
    type: "projects_list",
    data: projects.map((p) => ({
      title: p.title,
      description: p.description,
      link: p.link,
      techStack: p.techStack || [],
    })),
  };
}

function handleProjectCount(prompt) {
  const lower = toLower(prompt);

  const isCountIntent = includesAny(lower, [
    "how many",
    "total",
    "count",
    "number of",
  ]);

  const hasExplicitQuestionWord = includesAny(lower, ["how many"]);

  const mentionsProject = includesAny(lower, ["project", "projects"]);

  const mentionsNumber = /\b\d+\b/.test(lower);

  // STRICT RULE:
  // Only trigger when CLEARLY asking quantity
  if (!mentionsProject) return null;

  if (
    !(
      isCountIntent ||
      (hasExplicitQuestionWord && mentionsProject) ||
      mentionsNumber
    )
  ) {
    return null;
  }

  return {
    type: "chat",
    message: `He has developed ${projects.length} projects.`,
  };
}

function handleFeaturedProject(prompt) {
  const lower = toLower(prompt);

  if (
    !includesAny(lower, ["best project", "featured project", "top project"])
  ) {
    return null;
  }

  const featured = projects.find((p) => p.featured);

  return {
    type: "project",
    title: featured?.title,
    description: featured?.description,
    url: featured?.link,
    techStack: featured?.techStack || [],
  };
}

/* =========================
   EXPERIENCE
========================= */

function parsePeriod(period) {
  const monthMap = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const [start, endRaw] = period.split(" - ");

  const [startMonth, startYear] = start.split(" ");
  const startDate = new Date(startYear, monthMap[startMonth]);

  let endDate;

  if (endRaw.toLowerCase().includes("present")) {
    endDate = new Date();
  } else {
    const [endMonth, endYear] = endRaw.split(" ");
    endDate = new Date(endYear, monthMap[endMonth]);
  }

  return (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
}

function getTotalExperience() {
  const totalYears = experiences.reduce(
    (acc, exp) => acc + parsePeriod(exp.period),
    0,
  );

  return {
    type: "chat",
    message: `He has ${totalYears.toFixed(1)} years of professional frontend development experience.`,
  };
}

function getExperienceDetails() {
  return {
    type: "experience_detail",
    data: experiences,
  };
}

/* =========================
   SKILLS
========================= */

function handleSkills(prompt) {
  const lower = toLower(prompt);

  if (!includesAny(lower, ["skill", "skills", "stack", "technology"]))
    return null;

  return {
    type: "chat",
    message: formatSkills(skills),
  };
}

/* =========================
   FALLBACK
========================= */

function smartFallback(prompt) {
  const lower = toLower(prompt);

  if (includesAny(lower, ["experience", "years", "work history"])) {
    return getTotalExperience();
  }

  if (includesAny(lower, ["what", "list", "show", "all"])) {
    return handleAllProjects(prompt);
  }
  if (lower.trim().length < 3) {
    return {
      type: "chat",
      message:
        "Hey 👋 feel free to ask me about Gerald’s skills, projects, experience, resume or background.",
    };
  }

  return {
    type: "chat",
    message:
      "I’m not fully sure what you mean yet 😅\n\nTry asking about his skills, projects, experience, resume or background and I’ll help you out.",
  };
}

/* =========================
   MAIN HANDLER
========================= */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed." });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required." });
    }

    const lower = toLower(prompt);

    /* FAST ROUTES */
    const smallTalk = handleSmallTalk(prompt);
    if (smallTalk) return res.status(200).json(smallTalk);

    const link = handleLinkRequest(prompt);
    if (link) return res.status(200).json(link);

    const resume = handleResumeRequest(prompt);
    if (resume) {
      return res.status(200).json({
        type: "resume",
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/pdf/gerald-resume.pdf`,
        label: "Download Resume",
      });
    }

    const aboutResult = handleAbout(prompt);
    if (aboutResult) return res.status(200).json(aboutResult);

    const allProjects = handleAllProjects(prompt);
    if (allProjects) return res.status(200).json(allProjects);

    const projectCount = handleProjectCount(prompt);
    if (projectCount) return res.status(200).json(projectCount);

    const skillResult = handleSkills(prompt);
    if (skillResult) return res.status(200).json(skillResult);

    const featured = handleFeaturedProject(prompt);
    if (featured) return res.status(200).json(featured);

    const isExperienceQuery = includesAny(lower, [
      "experience",
      "worked",
      "years",
    ]);

    if (isExperienceQuery && !lower.includes("company")) {
      return res.status(200).json(getTotalExperience());
    }

    if (includesAny(lower, ["company", "employer", "worked for"])) {
      return res.status(200).json(getExperienceDetails());
    }

    /* AI CONTEXT */
    const context = await buildContext();

    const inputText = `
${context}

USER QUESTION:
${prompt}

RULES:
- Return ONLY valid JSON if intent matches schema
- Otherwise respond with natural text message
- No markdown
- No explanation

INTENTS:

1. resume:
{ "type": "resume" }

2. project:
{ "type": "project", "scope": "featured" }

3. project_tech:
{ "type": "project_tech" }

4. projects_list:
{ "type": "projects_list" }

5. skills:
{ "type": "skills" }

6. experience:
{ "type": "experience" }

7. experience_detail:
{ "type": "experience_detail" }

8. chat:
{ "type": "chat", "message": "answer user clearly" }

9. about:
{ "type": "about" }

IMPORTANT:
- If user asks "who is X", "about X", or "tell me about X" → use about
- If user asks about company, work history, or employer → use experience_detail
- If user asks years → use experience
`;

    const apiKey = process.env.NEXT_PUBLIC_AI_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputText }] }],
        }),
      },
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) return res.status(200).json(smartFallback(prompt));

    let ai = null;

    try {
      const cleaned = cleanAIResponse(raw);
      const jsonOnly = extractJSON(cleaned);
      if (!jsonOnly)
        return res.status(200).json({ type: "chat", message: cleaned });
      ai = JSON.parse(jsonOnly);
    } catch {
      return res
        .status(200)
        .json({ type: "chat", message: cleanAIResponse(raw) });
    }

    /* ROUTER */
    if (!ai?.type) return res.status(200).json(smartFallback(prompt));

    if (ai.type === "resume") {
      return res.status(200).json({
        type: "resume",
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/pdf/gerald-resume.pdf`,
        label: "Download Resume",
      });
    }

    if (ai.type === "about") {
      return res.status(200).json({
        type: "chat",
        message: formatAbout(about),
      });
    }

    if (ai.type === "skills") {
      return res.status(200).json({
        type: "chat",
        message: formatSkills(skills),
      });
    }

    if (ai.type === "chat") {
      return res.status(200).json({
        type: "chat",
        message: formatChat(ai.message),
      });
    }

    return res.status(200).json(smartFallback(prompt));
  } catch (err) {
    return res.status(500).json({
      type: "chat",
      message: "Something went wrong. Please try again.",
    });
  }
}
