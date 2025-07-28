import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setResponse(data.message);
    } catch (err) {
      console.error("Error:", err);
      setResponse("An error occurred while fetching response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-[30px]">
      <form onSubmit={handleSubmit} className="mb-[20px]">
        <textarea
          rows={4}
          className="w-full p-[20px] text-black font-bold"
          placeholder="Type your question about HASP CMS..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="mt-[20px] p-[10px]"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask Gerald AI"}
        </button>
      </form>

      <div>
        <h2>📄 Gerald AI Response:</h2>
        <p className="whitespace-pre-wrap">{response}</p>
      </div>
    </main>
  );
}
