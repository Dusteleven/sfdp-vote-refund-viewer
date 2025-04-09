import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import path from 'path';

export function initAdmin() {
  if (!getApps().length) {
    const serviceAccountJson = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string,
    'base64'
    ).toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

export const db = getFirestore();
