import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseAuth: Auth | null = firebaseConfig.apiKey
  ? getAuth(initializeApp(firebaseConfig))
  : null;

// Resolves false if the user closed the popup, so callers can skip showing an error.
export async function signInWithGoogle(): Promise<boolean> {
  if (!firebaseAuth) throw new Error("Firebase is not configured");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(firebaseAuth, provider);
    return true;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return false;
    throw e;
  }
}
