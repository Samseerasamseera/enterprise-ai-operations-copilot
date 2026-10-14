import { useEffect, useState } from "react";
import { api } from "../api";

interface Tenant {
  id: string;
  name: string;
}

interface WorkspacePageProps {
  onSelectTenant: (tenant: Tenant) => void;
  onLogout: () => void;
}

export default function WorkspacePage({
  onSelectTenant,
  onLogout,
}: WorkspacePageProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadTenants() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tenants");
      setTenants(response.data);
    } catch {
      setError("Unable to load workspaces. Please sign in again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTenants();
  }, []);

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await api.post("/tenants", { name: name.trim() });
      const tenant: Tenant = response.data;
      setTenants((previous) => [...previous, tenant]);
      setName("");
      onSelectTenant(tenant);
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      setError(message ?? "Unable to create workspace.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Enterprise AI Operations Copilot
            </p>
            <h1 className="mt-2 text-3xl font-bold">Your workspaces</h1>
            <p className="mt-2 text-sm text-slate-500">
              Select a workspace or create one to get started.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Sign out
          </button>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold">Create a workspace</h2>
          <form
            onSubmit={createWorkspace}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
              placeholder="e.g. Operations Team"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
            <button
              disabled={creating}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create workspace"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="font-bold">Available workspaces</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading workspaces...</p>
          ) : tenants.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No workspaces yet. Create one above.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => onSelectTenant(tenant)}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-md"
                >
                  <span className="text-sm font-bold">{tenant.name}</span>
                  <span className="mt-2 block break-all text-xs text-slate-400">
                    ID: {tenant.id}
                  </span>
                  <span className="mt-4 block text-sm font-semibold text-indigo-600">
                    Open workspace →
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
