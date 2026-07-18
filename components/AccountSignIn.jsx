import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccountSignIn({ compact = false }) {
  const { signIn, loading, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await signIn(email);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  return (
    <section className={`account-card ${compact ? "account-card-compact" : ""}`}>
      <p className="eyebrow">Email-only account</p>
      <h2>{compact ? "Sign in to log this meal" : "Keep your meals in one place"}</h2>
      <p>Enter an email to create a private history on this browser. No password, OTP or verification link is used in this interim version.</p>
      <form className="email-form" onSubmit={submit}>
        <label className="sr-only" htmlFor={`email-${compact ? "compact" : "page"}`}>Email address</label>
        <input
          id={`email-${compact ? "compact" : "page"}`}
          className="text-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <button className="btn-primary btn-inline" type="submit" disabled={loading || !isConfigured}>
          {loading ? "Signing in…" : "Continue with email"}
        </button>
      </form>
      {!isConfigured && <p className="form-error">Supabase browser configuration is missing.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="account-fine">Your email is not public. Verified, cross-device sign-in is deliberately reserved for the later Supabase Auth upgrade.</p>
    </section>
  );
}
