'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  Firestore,
  DocumentData,
  getDocs,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export type Validator = {
  pubkey: string;
  name?: string;
};

export type RewardEntry = {
  epoch: number;
  amount: number;
  signature: string;
  slot: number;
  timestamp: any;
  from: string;
};

type FirebaseContextType = {
  db: Firestore | null;
  validators: Validator[];
  validatorRewards: Record<string, RewardEntry[]>;
  loadingValidators: boolean;
  getValidatorRewards: (pubkey: string) => Promise<RewardEntry[]>;
};

const FirebaseContext = createContext<FirebaseContextType>({
  db: null,
  validators: [],
  validatorRewards: {},
  loadingValidators: true,
  getValidatorRewards: async () => [],
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Firestore | null>(null);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [validatorRewards, setValidatorRewards] = useState<
    Record<string, RewardEntry[]>
  >({});
  const [loadingValidators, setLoadingValidators] = useState(true);

  useEffect(() => {
    if (!getApps().length) {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      setDb(firestore);

      const unsub = onSnapshot(
        collection(firestore, 'validators'),
        (snapshot) => {
          const validatorList: Validator[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return { pubkey: docSnap.id, name: data.mnName || null };
          });

          setValidators(validatorList);
          setLoadingValidators(false);
        }
      );

      return () => unsub();
    }
  }, []);

  const getValidatorRewards = async (
    pubkey: string
  ): Promise<RewardEntry[]> => {
    if (!db) return [];
    if (validatorRewards[pubkey]) return validatorRewards[pubkey];

    const rewardsSnapshot = await getDocs(
      collection(db, 'validator_rewards', pubkey, 'rewards')
    );
    const rewards = rewardsSnapshot.docs.map((r) => r.data() as RewardEntry);
    setValidatorRewards((prev) => ({ ...prev, [pubkey]: rewards }));
    return rewards;
  };

  return (
    <FirebaseContext.Provider
      value={{
        db,
        validators,
        validatorRewards,
        loadingValidators,
        getValidatorRewards,
      }}>
      {children}
    </FirebaseContext.Provider>
  );
}