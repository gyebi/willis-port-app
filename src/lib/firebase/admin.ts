import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: applicationDefault(),
      })
    : getApps()[0];

export const firebaseAdminAuth = getAuth(adminApp);