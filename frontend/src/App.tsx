import { useEffect, useState } from "react";
import { api, setAccessToken } from "./api";

import AuthPage from "./pages/AuthPage";
import WorkspacePage from "./pages/WorkspacePage";
import DocumentsPage from "./pages/DocumentsPage";
import SearchPage from "./pages/SearchPage";
import CopilotPage from "./pages/CopilotPage";

import {
  Activity,
  Bot,
  BrainCircuit,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Zap,
  ArrowUpRight,
  Database,
} from "lucide-react";

type Tenant = {
  id: string;
  name: string;
};

type DashboardMetrics = {
  documents_indexed: number;
  knowledge_chunks: number;
  ai_queries: number;
};

type Page = "dashboard" | "documents" | "search" | "copilot";

function App() {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("access_token"),
  );

  const [tenant, setTenant] = useState<Tenant | null>(() => {
    try {
      const saved = sessionStorage.getItem("selected_tenant");
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem("selected_tenant");
      return null;
    }
  });

  const [activePage, setActivePage] = useState<Page>("dashboard");

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  function handleLogin(accessToken: string) {
    sessionStorage.setItem("access_token", accessToken);
    setAccessToken(accessToken);
    setToken(accessToken);
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("selected_tenant");

      setAccessToken(null);
      setToken(null);
      setTenant(null);
      setMetrics(null);
      setMetricsError(null);
      setActivePage("dashboard");
    }
  }

  function handleSelectTenant(selected: Tenant) {
    sessionStorage.setItem("selected_tenant", JSON.stringify(selected));
    setTenant(selected);
    setMetrics(null);
    setActivePage("dashboard");
  }

  useEffect(() => {
    function handleAuthExpired() {
      setAccessToken(null);
      setToken(null);
      setTenant(null);
      setMetrics(null);
      setMetricsError(null);
      setActivePage("dashboard");
    }

    window.addEventListener("auth:expired", handleAuthExpired);

    return () => {
      window.removeEventListener("auth:expired", handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setMetrics(null);
      setMetricsLoading(false);
      return;
    }

    if (!tenant) {
      setMetrics(null);
      setMetricsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMetrics() {
      setMetricsLoading(true);
      setMetricsError(null);

      try {
        const response = await api.get<DashboardMetrics>(
          `/tenants/${tenant!.id}/metrics`,
        );

        if (!cancelled) {
          setMetrics(response.data);
        }
      } catch {
        if (!cancelled) {
          setMetrics(null);
          setMetricsError("Unable to load dashboard metrics.");
        }
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    }

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [token, tenant]);

  const stats = [
    {
      label: "Documents Indexed",
      value: metricsLoading
        ? "..."
        : metrics
          ? String(metrics.documents_indexed)
          : "—",
      note: "Your knowledge base",
      icon: FileText,
    },
    {
      label: "AI Queries",
      value: metricsLoading
        ? "..."
        : metrics
          ? String(metrics.ai_queries)
          : "—",
      note: "Questions answered",
      icon: BrainCircuit,
    },
    {
      label: "Knowledge Chunks",
      value: metricsLoading
        ? "..."
        : metrics
          ? String(metrics.knowledge_chunks)
          : "—",
      note: "Searchable content",
      icon: Database,
    },
    {
      label: "System Status",
      value: metricsLoading
        ? "Checking"
        : metricsError
          ? "Unavailable"
          : "Online",
      note: metricsError ?? "Workspace connected",
      icon: Activity,
    },
  ];

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (!tenant) {
    return (
      <WorkspacePage
        onSelectTenant={handleSelectTenant}
        onLogout={handleLogout}
      />
    );
  }

  if (activePage === "documents") {
    return (
      <DocumentsPage
        tenantId={tenant.id}
        onBack={() => setActivePage("dashboard")}
      />
    );
  }

  if (activePage === "search") {
    return (
      <SearchPage
        tenantId={tenant.id}
        onBack={() => setActivePage("dashboard")}
      />
    );
  }

  if (activePage === "copilot") {
    return (
      <CopilotPage
        tenantId={tenant.id}
        onBack={() => setActivePage("dashboard")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <BrainCircuit size={23} />
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight">Enterprise AI</p>
            <p className="text-xs text-slate-500">Operations Copilot</p>
          </div>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActivePage("dashboard")}
              className="flex w-full items-center gap-3 rounded-xl bg-indigo-50 px-3 py-3 text-left text-sm font-semibold text-indigo-700"
            >
              <LayoutDashboard size={18} />
              Overview
            </button>

            <button
              type="button"
              onClick={() => setActivePage("documents")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <FileText size={18} />
              Documents
            </button>

            <button
              type="button"
              onClick={() => setActivePage("search")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
            >
              <Search size={18} />
              Knowledge Search
            </button>

            <button
              type="button"
              onClick={() => setActivePage("copilot")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-indigo-700"
            >
              <Bot size={18} />
              AI Copilot
            </button>
          </nav>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Administration
          </p>

          <nav className="space-y-1">
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500">
              <ShieldCheck size={18} />
              Security
            </div>

            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500">
              <Users size={18} />
              Team &amp; Access
            </div>

            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500">
              <Settings size={18} />
              Settings
            </div>
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-white">
            <div className="mb-3 flex items-center gap-2">
              <Zap size={17} className="text-amber-400" />
              <span className="text-sm font-semibold">AI workspace</span>
            </div>

            <p className="text-xs leading-5 text-slate-300">
              Your private knowledge assistant, powered by retrieval-augmented
              generation.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Workspace connected
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Workspace / Overview
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
              Operations Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Local environment
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-sm hover:bg-slate-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                AI
              </div>
              <span className="hidden max-w-32 truncate font-medium sm:inline">
                {tenant.name}
              </span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>
          </div>
        </header>

        <div id="overview" className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-7 text-white shadow-xl shadow-indigo-100 sm:p-10">
            <div className="relative z-[1] max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
                <Zap size={14} className="text-amber-300" />
                Intelligent enterprise workspace
              </div>

              <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Your knowledge.
                <br />
                One intelligent copilot.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-indigo-100 sm:text-base">
                Search internal documents, uncover insights, and get contextual
                answers from your organization's knowledge.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActivePage("copilot")}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <Bot size={17} />
                  Open AI Copilot
                  <ArrowUpRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage("documents")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Upload size={17} />
                  Add documents
                </button>
              </div>
            </div>

            <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-4 -top-12 h-56 w-56 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 right-28 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

            <BrainCircuit
              className="absolute bottom-7 right-8 hidden text-white/15 sm:block"
              size={150}
              strokeWidth={1}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {stat.label}
                      </p>

                      <p className="mt-3 text-3xl font-bold tracking-tight">
                        {stat.value}
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                      <Icon size={21} />
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">{stat.note}</p>
                </div>
              );
            })}
          </section>

          <section>
            <div className="mb-5">
              <h3 className="text-lg font-bold tracking-tight">Get started</h3>
              <p className="mt-1 text-sm text-slate-500">
                Explore the tools available in your AI workspace.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => setActivePage("documents")}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Upload size={23} />
                </div>

                <h4 className="mt-5 font-bold">Upload documents</h4>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  Add PDF and TXT files to your private knowledge base.
                </p>

                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-indigo-600">
                  <span>Open document workspace</span>
                  <ArrowUpRight size={17} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePage("search")}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Search size={23} />
                </div>

                <h4 className="mt-5 font-bold">Search your knowledge</h4>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  Find relevant information across indexed documents.
                </p>

                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-indigo-600">
                  <span>Explore semantic search</span>
                  <ArrowUpRight size={17} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePage("copilot")}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Bot size={23} />
                </div>

                <h4 className="mt-5 font-bold">Ask AI Copilot</h4>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  Get answers grounded in your documents with source citations.
                </p>

                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-indigo-600">
                  <span>Start a conversation</span>
                  <ArrowUpRight size={17} />
                </div>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Activity size={19} className="text-indigo-600" />
                  <h3 className="font-bold">Platform overview</h3>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {metricsError
                    ? metricsError
                    : metricsLoading
                      ? "Loading live workspace metrics..."
                      : "Your dashboard is connected to live workspace data."}
                </p>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                  metricsError
                    ? "bg-red-50 text-red-700"
                    : metricsLoading
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    metricsError
                      ? "bg-red-500"
                      : metricsLoading
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />

                {metricsError
                  ? "Metrics unavailable"
                  : metricsLoading
                    ? "Loading metrics"
                    : "Live data connected"}
              </div>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
            <span>Enterprise AI Operations Copilot</span>
            <span>
              Secure knowledge. Contextual answers. Intelligent workflows.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
