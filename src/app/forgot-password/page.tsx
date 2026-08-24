"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";

import "./forgot-password.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setMessage("");

    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch {
      // Intentionally return the same response so we do not reveal
      // whether a staff email exists in Firebase Authentication.
    } finally {
      setMessage(
        "If this email belongs to an authorized Willis Port account, password reset instructions have been sent."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="forgotPasswordPage">
      <section className="resetCard">
        <div className="resetBrand">
          <Image
            src="/willis-log.png"
            alt="Willis Port Logistics"
            width={230}
            height={100}
            priority
            className="resetLogo"
          />

          <p>Authorized Willis Port staff only</p>
        </div>

        <div className="resetHeading">
          <div className="resetIcon">↺</div>

          <h1>Reset Password</h1>

          <p>
            Enter your staff email address and we will send password reset
            instructions if the account is registered.
          </p>
        </div>

        <form className="resetForm" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <div className="resetInputWrap">
            <span aria-hidden="true">✉</span>

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

          <button
            className="resetButton"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>

          {message ? (
            <p className="resetMessage" role="status">
              {message}
            </p>
          ) : null}
        </form>

        <Link href="/sign-in" className="backToSignIn">
          ← Back to Sign In
        </Link>
      </section>
    </main>
  );
}