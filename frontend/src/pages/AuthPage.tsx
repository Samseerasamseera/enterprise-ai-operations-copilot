import { useState, type FormEvent } from "react";
import { BrainCircuit, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { api, setAccessToken } from "../api";

interface AuthPageProps {
  onLogin: (token: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";

      if (isRegister) {
        await api.post(endpoint, { email, password });
      }

      const response = await api.post("/auth/login", { email, password });
      const token = response.data.access_token as string;

      setAccessToken(token);
      onLogin(token);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const response = (err as { response?: { data?: { detail?: string } } })
          .response;
        setError(response?.data?.detail ?? "Authentication failed.");
      } else {
        setError(
          "Cannot connect to the backend. Check that FastAPI is running.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 to-violet-600 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <BrainCircuit size={26} />
            </div>
            <div>
              <p className="font-bold">Enterprise AI</p>
              <p className="text-sm text-indigo-100">Operations Copilot</p>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Your knowledge.
              <br />
              Your intelligent copilot.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-indigo-100">
              Discover information, search internal documents, and get
              contextual answers with AI-powered assistance.
            </p>
          </div>

          <p className="text-xs text-indigo-200">
            Secure access to your enterprise workspace
          </p>
        </section>

        <section className="p-7 sm:p-12">
          <div className="mb-8 md:hidden">
            <BrainCircuit size={32} className="text-indigo-600" />
            <h1 className="mt-3 text-xl font-bold">Enterprise AI Copilot</h1>
          </div>

          <p className="text-sm font-medium text-indigo-600">
            Welcome to your workspace
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {isRegister ? "Create account" : "Welcome back"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {isRegister
              ? "Create your account to get started."
              : "Sign in to continue to your AI workspace."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isRegister ? 12 : 1}
                  maxLength={128}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegister
                      ? "At least 12 characters"
                      : "Enter your password"
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading && <LoaderCircle size={18} className="animate-spin" />}
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to the workspace?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
