"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      {isLoading && (
        <div className="auth-loading" role="status" aria-live="polite">
          <div className="auth-loading-card">
            <Image
              src="/brand/logoSOscuro.svg"
              alt="NoteBeat"
              width={160}
              height={40}
              className="auth-loading-logo"
              priority
            />
            <div className="auth-spinner" aria-hidden="true" />
            <p className="auth-loading-title">Signing you in...</p>
            <p className="auth-loading-copy">Please wait a moment.</p>
          </div>
        </div>
      )}
      <div className="auth-grid">
        <section className="auth-aside">
          <div className="auth-visual">
            <div className="auth-brand">
              <Image
                src="/brand/logoSOscuro.svg"
                alt="NoteBeat"
                width={210}
                height={56}
                className="auth-logo"
                priority
              />
            </div>
            <p className="auth-eyebrow">Welcome to NoteBeat</p>
            <h1 className="auth-title">Give rhythm to what you feel.</h1>
            <p className="auth-subtitle">
              Save notes, chat with AI, and connect emotions with music in seconds.
            </p>
            <div className="auth-chips">
              <span className="auth-chip">Emotional summary</span>
              <span className="auth-chip">Music suggestions</span>
              <span className="auth-chip">Shared notes</span>
            </div>
            <div className="auth-note">
              <div className="auth-note-top">
                <span className="auth-note-dot" />
                <p className="auth-note-title">Quiet rain</p>
                <span className="auth-note-pill">New</span>
              </div>
              <p className="auth-note-text">
                I wrote about coming home and letting music organize my thoughts.
              </p>
              <div className="auth-note-meta">
                <span>By Diana</span>
                <span>May 18, 2026</span>
              </div>
              <div className="auth-song">
                <div className="auth-song-art" />
                <div>
                  <p className="auth-song-title">Afterglow</p>
                  <p className="auth-song-artist">Rina Sawayama</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <Link href="/" className="auth-back">
              <svg
                className="auth-back-icon"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12.5 4.5L7 10l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to landing
            </Link>
            <h2 className="auth-form-title">Sign in</h2>
            <p className="auth-form-copy">
              Access your notes and conversations.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary auth-submit"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="auth-switch">
              New here?{" "}
              <Link href="/register" className="auth-link">
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
