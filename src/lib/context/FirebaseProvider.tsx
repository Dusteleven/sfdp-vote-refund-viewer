'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useMemo,
} from 'react';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  collection,
  getDocs,
  query,
  limit,
  orderBy,
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Types
interface Validator {
  pubkey: string;
  name: string;
  sfdp2OnboardingEpoch?: number;
  lastUpdated?: any;
}

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  validators: Validator[];
  loadingValidators: boolean;
  refreshValidators: () => Promise<void>;
}

// Create context
const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  validators: [],
  loadingValidators: true,
  refreshValidators: async () => {},
});

// Number of validators to load initially
const VALIDATORS_INITIAL_LOAD = 1100;

// Provider component
export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [loadingValidators, setLoadingValidators] = useState(true);

  // Initialize Firebase
  useEffect(() => {
    if (!getApps().length) {
      const app = initializeApp(firebaseConfig);
      setApp(app);
      setDb(getFirestore(app));
    } else {
      setApp(getApps()[0]);
      setDb(getFirestore(getApps()[0]));
    }
  }, []);

  // Load initial validators
  useEffect(() => {
    if (db) {
      loadInitialValidators();
    }
  }, [db]);

  // Load initial batch of validators
  const loadInitialValidators = async () => {
    if (!db) return;

    try {
      setLoadingValidators(true);

      const validatorsQuery = query(
        collection(db, 'validators'),
        orderBy('name'),
        limit(VALIDATORS_INITIAL_LOAD)
      );

      const validatorsSnapshot = await getDocs(validatorsQuery);

      const validatorsList: Validator[] = [];
      validatorsSnapshot.forEach((doc) => {
        validatorsList.push({
          pubkey: doc.id,
          ...doc.data(),
        } as Validator);
      });

      setValidators(validatorsList);
    } catch (error) {
      console.error('Error loading validators:', error);
    } finally {
      setLoadingValidators(false);
    }
  };

  // Refresh validators (reload from the beginning)
  const refreshValidators = async () => {
    if (!db) return;

    setValidators([]);
    await loadInitialValidators();
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      app,
      db,
      validators,
      loadingValidators,
      refreshValidators,
    }),
    [app, db, validators, loadingValidators]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to use the Firebase context
export function useFirebase() {
  return useContext(FirebaseContext);
}
