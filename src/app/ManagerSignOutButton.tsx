"use client";

import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type ManagerSignOutButtonProps = {
  className?: string;
};

export default function ManagerSignOutButton({
  className,
}: ManagerSignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      await firebaseAuth.signOut();
    } finally {
      window.location.href = "/sign-in";
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className}
    >
      {isSigningOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}