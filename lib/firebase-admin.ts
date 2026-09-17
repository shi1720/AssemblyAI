import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
function app() {
  return (
    getApps()[0] ||
    initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        "gen-lang-client-0444960702",
    })
  );
}
export function adminAuth() {
  return getAuth(app());
}
export function firestore() {
  return getFirestore(app(), process.env.FIRESTORE_DATABASE_ID || "benchback");
}
