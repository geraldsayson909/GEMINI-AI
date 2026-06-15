import { useState, useRef, useEffect, useMemo } from "react";

/* =========================
   ICONS
========================= */
const UserIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill="black" />
    <path d="M4 20c1.5-4 14.5-4 16 0" stroke="black" strokeWidth="2" />
  </svg>
);

const AIIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="4" fill="black" />
    <circle cx="9" cy="12" r="1.5" fill="white" />
    <circle cx="15" cy="12" r="1.5" fill="white" />
  </svg>
);

const MessageIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24">
    <path d="M4 4h16v12H7l-3 3V4z" fill="white" />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" />
  </svg>
);

const FullscreenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
      stroke="white"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M5 12h14" stroke="white" strokeWidth="2" />
  </svg>
);

/* =========================
   MAIN
========================= */
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const bottomRef = useRef(null);

  const welcomeMessage = useMemo(
    () => ({
      role: "ai",
      data: {
        type: "chat",
        message:
          "Hi! I'm Gerald AI 👋\n\nI'm your portfolio assistant. You can ask me about skills, experience, projects, resume or background — and I’ll guide you through everything.",
      },
    }),
    [],
  );

  /* INIT */
  useEffect(() => {
    const hasSeen = sessionStorage.getItem("seen_welcome");

    if (!hasSeen) {
      setMessages([welcomeMessage]);
      sessionStorage.setItem("seen_welcome", "true");
    } else {
      setMessages([welcomeMessage]);
    }
  }, [welcomeMessage]);

  /* SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* SEND MESSAGE */
  const sendMessage = async () => {
    if (!prompt.trim()) return;

    const userMsg = { role: "user", text: prompt };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      setMessages((prev) => [...prev, { role: "ai", data }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          data: { type: "chat", message: "Error connecting to API" },
        },
      ]);
    }

    setLoading(false);
  };

  /* RENDER AI */
  const renderAI = (msg) => {
    const data = msg.data;
    if (!data) return <p>No response</p>;

    switch (data.type) {
      case "chat":
        return <p>{data.message}</p>;

      case "resume":
        return (
          <a
            href={data.url}
            target="_blank"
            className="text-blue-600 underline"
          >
            {data.label}
          </a>
        );

      case "project":
        return (
          <div>
            <p className="font-bold">{data.title}</p>
            <p className="text-sm opacity-70">{data.description}</p>
            <a
              href={data.url}
              target="_blank"
              className="text-blue-500 underline"
            >
              Visit Project
            </a>
          </div>
        );

      case "projects_list":
        return (
          <div className="space-y-3">
            <p className="font-bold">
              He has developed {data.data.length} projects:
            </p>

            {data.data.map((p, i) => (
              <div key={i} className="border p-2 rounded">
                <p className="font-bold">{p.title}</p>
                <p className="text-sm opacity-70">{p.description}</p>

                <a
                  href={p.link}
                  target="_blank"
                  className="text-blue-600 underline text-xs"
                >
                  Visit Project
                </a>
              </div>
            ))}
          </div>
        );

      case "experience_detail":
        return (
          <div className="space-y-2">
            {data.data.map((e, i) => (
              <div key={i} className="border p-2 rounded">
                <p className="font-bold">{e.company}</p>
                <p>{e.role}</p>
                <p className="text-xs opacity-60">{e.duration}</p>
              </div>
            ))}
          </div>
        );

      case "skills":
        return (
          <div>
            {data.data.map((group, i) => (
              <div key={i}>
                <p className="font-bold">{group.category}</p>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((s, j) => (
                    <span
                      key={j}
                      className="text-xs bg-gray-200 px-2 py-1 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <p>{data.message || "Unsupported response"}</p>;
    }
  };
  /* =========================
     FLOAT BUTTON (CLOSED)
  ========================= */
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white p-4 rounded-full shadow-lg hover:scale-105 transition"
        >
          <MessageIcon />
        </button>
      </div>
    );
  }

  /* =========================
     CHAT WINDOW
  ========================= */
  return (
    <div
      className={`fixed  bg-gray-100 shadow-2xl flex flex-col rounded-xl overflow-hidden transition-all
      ${isFullscreen ? "w-full h-full bottom-0 right-0 rounded-none" : "w-[380px] bottom-6 right-6"}
      ${isMinimized ? "h-[60px]" : "h-[520px]"}`}
    >
      {/* HEADER */}
      <div className="bg-black text-white flex justify-between items-center p-3">
        <span className="font-bold">Gerald AI</span>

        <div className="flex gap-2 items-center">
          <button onClick={() => setIsMinimized((v) => !v)}>
            <MinimizeIcon />
          </button>

          <button onClick={() => setIsFullscreen((v) => !v)}>
            <FullscreenIcon />
          </button>

          <button onClick={() => setIsOpen(false)}>
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* BODY (ONLY HIDDEN WHEN MINIMIZED) */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "ai" && <AIIcon />}

                <div
                  className={`p-3 rounded-xl text-sm max-w-[75%] ${
                    msg.role === "user"
                      ? "bg-black text-white"
                      : "bg-white text-black"
                  }`}
                >
                  {msg.role === "user" ? msg.text : renderAI(msg)}
                </div>

                {msg.role === "user" && <UserIcon />}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center">
                <AIIcon />
                <div className="bg-white px-3 py-2 rounded-xl text-sm">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* INPUT */}
          <div className="p-2 bg-white flex gap-2 border-t">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 border px-3 py-2 rounded text-black"
              placeholder="Ask something..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              onClick={sendMessage}
              className="bg-black text-white px-4 rounded"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
