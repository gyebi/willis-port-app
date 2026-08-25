"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

import { firebaseAuth } from "@/lib/firebase/client";
import Link from "next/link";

import "./sign-in.css";

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );

      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        await firebaseAuth.signOut();
        setError(
          result?.error ??
          "You are not authorized to access Willis Port."
        );
        return;
      }

      if (result.user?.role === "AGENT") {
        router.replace("/agent/entry");
        return;
      }

      if (result.user?.role === "MANAGER") {
        router.replace("/");
        return;
      }

      await firebaseAuth.signOut();
      setError("Your Willis Port account does not have a valid role.");
    } catch {
      setError("Unable to sign in. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signInPage">
      <section className="signInHero">
        <div className="heroCard">
          <Image
            src="/willis-log.png"
            alt="logo"
            fill
            priority
            sizes="50vw"
            className="signInHeroImage"
          />
        </div>
      </section>

      <section className="signInPanel">
        <div className="signInContent">
          <div className="brandBlock">
            

            <p>Authorized Willis Port staff only</p>
          </div>

          <div className="signInHeading">
            <h1>Staff Sign In</h1>
          </div>

          <form className="signInCard" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>

            <div className="inputWrap">
              <span className="inputIcon">✉</span>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@willisport.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <label htmlFor="password">Password</label>

            <div className="inputWrap">
              <span className="inputIcon">🔒</span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />

              <button
                className="passwordToggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error ? (
              <p className="signInError" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="signInButton"
              type="submit"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </span>

              {!isSubmitting ? <span>→</span> : null}
            </button>

            <Link
              href="/forgot-password"
              className="forgotPassword"
            >
              Forgot password?
            </Link>
          </form>

          <div className="accessNote">
            <span />
            <strong>⚓</strong>
            <span />
          </div>

          <p className="accessText">Agent and Manager access</p>
        </div>
      </section>
    </main>
  );
}