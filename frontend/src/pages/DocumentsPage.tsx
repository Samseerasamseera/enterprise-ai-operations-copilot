import { useState, type ChangeEvent } from "react";
import { api } from "../api";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

interface DocumentsPageProps {
  tenantId: string;
  onBack: () => void;
}

export default function DocumentsPage({
  tenantId,
  onBack,
}: DocumentsPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    filename?: string;
    status?: string;
    chunk_count?: number;
  } | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
    setError("");
    setResult(null);
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF or TXT file.");
      return;
    }

    if (!["application/pdf", "text/plain"].includes(file.type)) {
      setError("Please select a PDF or TXT file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The maximum file size is 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);

    try {
      const response = await api.post(
        `/tenants/${tenantId}/documents/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setResult(response.data);
      setMessage("Document uploaded successfully.");
      setFile(null);
    } catch (err: unknown) {
      const response =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
          : undefined;

      setError(
        response?.data?.detail ??
          "Upload failed. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onBack}
          className="mb-6 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload files to your workspace's searchable knowledge base.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="font-bold">Upload a document</h2>
              <p className="text-sm text-slate-500">
                PDF or TXT · Maximum 10 MB
              </p>
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 px-5 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
            <FileText size={34} className="text-indigo-500" />
            <span className="mt-3 text-sm font-semibold">
              {file ? file.name : "Choose a document"}
            </span>
            <span className="mt-2 text-xs text-slate-500">
              Select a PDF or plain-text file from your computer
            </span>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <p className="mt-3 text-xs text-slate-500">
              File size: {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            {loading ? "Uploading and indexing..." : "Upload document"}
          </button>

          {message && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <div>
                <p>{message}</p>
                {result?.filename && (
                  <p className="mt-1">File: {result.filename}</p>
                )}
                {result?.status && <p>Status: {result.status}</p>}
                {result?.chunk_count !== undefined && (
                  <p>Chunks created: {result.chunk_count}</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
