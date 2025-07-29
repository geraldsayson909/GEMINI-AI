import { useState } from "react";
import pagesData from "@/static-data/pages.json";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);

  const handleFileUpload = async (e) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setFileUploaded(true);
    alert(data.message);
    setUploading(false);
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResponse(data.message);
    setLoading(false);
  };

  // console.log(pagesData,"TESTA")

  return (
    <main className="p-[30px]">
      <h2 className="text-xl font-bold mb-4">1️⃣ Upload .docx File</h2>
      <input type="file" accept=".docx" onChange={handleFileUpload} />
      {uploading && <p>Uploading file...</p>}
      {fileUploaded && <p className="text-green-600">✅ File uploaded.</p>}

      <h2 className="text-xl font-bold mt-10 mb-4">2️⃣ Ask a Question</h2>
      <form onSubmit={handlePromptSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full p-2 border text-black"
          placeholder="Ask something about the uploaded file..."
        />
        <button type="submit" disabled={loading || !fileUploaded}>
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </form>

      <div className="mt-6">
        <h2 className="font-semibold">📄 Answer:</h2>
        <pre className="whitespace-pre-wrap">{response}</pre>
      </div>
      {pagesData.length > 0 && (
      <table className="min-w-full border-collapse border border-gray-300 mt-[50px]">
        <thead>
          <tr className="">
            <th className="border px-4 py-2 text-left">Name</th>
            <th className="border px-4 py-2 text-left">URL</th>
            <th className="border px-4 py-2 text-left">Meta Keywords</th>
            <th className="border px-4 py-2 text-left">Meta Description</th>
          </tr>
        </thead>
        <tbody>
          {pagesData?.map((item, index) => (
            <tr key={index} className="">
              <td className="border px-4 py-2">{item?.name}</td>
              <td className="border px-4 py-2">{item?.url}</td>
              <td className="border px-4 py-2">{item?.keywords}</td>
              <td className="border px-4 py-2">{item?.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </main>
  );
}
