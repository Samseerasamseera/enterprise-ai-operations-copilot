import { useState, type FormEvent } from "react";
import { api } from "../api";
import {
  Search,
  FileText,
  LoaderCircle,
  AlertCircle,
  ArrowLeft,
  Database,
} from "lucide-react";

interface SearchPageProps {
  tenantId: string;
  onBack: () => void;
}

interface SearchResult {
  content: string;
  document_id: string;
  chunk_index: number;
  distance?: number;
}

export default function SearchPage({ tenantId, onBack }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(false);
    setResults([]);

    try {
      const response = await api.post(`/tenants/${tenantId}/search`, {
        query: query.trim(),
        top_k: 5,
      });

      setResults(response.data.results ?? []);
      setSearched(true);
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
          "Search failed. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
            <Search size={25} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Knowledge Search
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Search information across your uploaded documents.
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <form onSubmit={handleSearch}>
            <label
              htmlFor="search-query"
              className="mb-2 block text-sm font-semibold"
            >
              What would you like to find?
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="search-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your documents..."
                minLength={2}
                maxLength={2000}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Database size={15} />
            Searching up to 5 relevant passages
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {searched && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Search results</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Search size={30} className="mx-auto text-slate-400" />
                <p className="mt-3 font-semibold">No matching passages found</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try different keywords or upload another document.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <article
                    key={`${result.document_id}-${result.chunk_index}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">Result {index + 1}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                            Chunk {result.chunk_index}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                          {result.content}
                        </p>

                        <p className="mt-4 break-all border-t border-slate-100 pt-3 text-xs text-slate-400">
                          Document ID: {result.document_id}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
