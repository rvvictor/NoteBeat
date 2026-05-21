"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
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
      await register({ email, password });
      router.push("/login");
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
            <p className="auth-loading-title">Creating your account...</p>
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
            <p className="auth-eyebrow">Create your space</p>
            <h1 className="auth-title">Your emotional journal starts here.</h1>
            <p className="auth-subtitle">
              Create notes with music, save moments, and share emotions with ease.
            </p>
            <div className="auth-chips">
              <span className="auth-chip">Private notes</span>
              <span className="auth-chip">AI summary</span>
              <span className="auth-chip">Real community</span>
            </div>
            <div className="auth-note">
              <div className="auth-note-top">
                <span className="auth-note-dot" />
                <p className="auth-note-title">New beginning</p>
                <span className="auth-note-pill">First day</span>
              </div>
              <p className="auth-note-text">
                A short note to leave a kind reminder and a favorite song.
              </p>
              <div className="auth-note-meta">
                <span>By FerV24</span>
                <span>May 20, 2026</span>
              </div>
              <div className="auth-song">
                <div className="auth-song-art" />
                <div>
                  <p className="auth-song-title">Bloom</p>
                  <p className="auth-song-artist">Troye Sivan</p>
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
            <h2 className="auth-form-title">Create account</h2>
            <p className="auth-form-copy">
              Sign up to start saving your notes.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="register-password">
                  Password
                </label>
                <input
                  id="register-password"
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
                {isLoading ? "Creating..." : "Create account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <Link href="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
