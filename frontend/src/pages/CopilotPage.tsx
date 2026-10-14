import { useState, type FormEvent } from "react";
import { api } from "../api";
import {
  ArrowLeft,
  Bot,
  User,
  Send,
  LoaderCircle,
  AlertCircle,
  FileText,
  Sparkles,
} from "lucide-react";

interface CopilotPageProps {
  tenantId: string;
  onBack: () => void;
}

interface Source {
  source: string;
  document_id: string;
  chunk_index: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function CopilotPage({ tenantId, onBack }: CopilotPageProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedQuestion = question.trim();

    if (submittedQuestion.length < 2 || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: submittedQuestion },
    ]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await api.post(`/tenants/${tenantId}/qa/ask`, {
        question: submittedQuestion,
        top_k: 5,
      });

      const data = response.data;

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer ?? "No answer was returned.",
          sources: data.sources ?? [],
        },
      ]);
    } catch (err: unknown) {
      const response =
        typeof err === "object" && err !== null && "response" in err
          ? (
              err as {
                response?: {
                  data?: { detail?: string };
                };
              }
            ).response
          : undefined;

      setError(
        response?.data?.detail ??
          "Unable to get an answer. Check that the backend and AI service are available.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Bot size={23} />
          </div>

          <div className="flex-1">
            <h1 className="font-bold">AI Copilot</h1>
            <p className="text-xs text-slate-500">
              Answers grounded in your documents
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Workspace active
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-8">
        {messages.length === 0 && (
          <div className="m-auto max-w-xl py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Sparkles size={30} />
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight">
              What would you like to know?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Ask a question about your uploaded documents. The Copilot
              retrieves relevant passages and uses them to generate a contextual
              answer.
            </p>

            <button
              type="button"
              onClick={() =>
                setQuestion(
                  "Summarize the key information in my uploaded documents.",
                )
              }
              className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              <span className="font-semibold text-indigo-600">Try asking</span>
              <span className="mt-1 block">
                Summarize my uploaded documents
              </span>
            </button>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-6 pb-6">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className="flex items-start gap-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    message.role === "user"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {message.role === "user" ? (
                    <User size={18} />
                  ) : (
                    <Bot size={19} />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-2 text-sm font-bold">
                    {message.role === "user" ? "You" : "AI Copilot"}
                  </p>

                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {message.content}
                  </div>

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                        <FileText size={15} />
                        Sources
                      </p>

                      <div className="space-y-2">
                        {message.sources.map((source, sourceIndex) => (
                          <div
                            key={`${source.document_id}-${source.chunk_index}-${sourceIndex}`}
                            className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                          >
                            <p className="font-semibold">
                              {source.source || `Source ${sourceIndex + 1}`}
                            </p>
                            <p className="mt-1 break-all text-slate-400">
                              Document: {source.document_id}
                            </p>
                            <p className="mt-1 text-slate-400">
                              Chunk: {source.chunk_index}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {loading && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-indigo-600" />
            Searching documents and generating an answer...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 mt-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/50"
        >
          <label htmlFor="copilot-question" className="sr-only">
            Ask AI Copilot
          </label>

          <textarea
            id="copilot-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask a question about your documents..."
            rows={2}
            maxLength={2000}
            className="w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
          />

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">
              Enter to send · Shift + Enter for a new line
            </p>

            <button
              type="submit"
              disabled={loading || question.trim().length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              Ask
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
