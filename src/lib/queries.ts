import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  where,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase if not already initialized
function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

// Get Firestore instance
function getFirestoreDb() {
  const app = getFirebaseApp();
  return getFirestore(app);
}

// Type for epoch status
export interface EpochStatus {
  epoch: number;
  refundSent: boolean;
  totalRefunds: number;
  validatorsPaid: string[];
  lastUpdated: any;
}

// Cache for epoch data to reduce Firestore reads
const epochCache = new Map<number, EpochStatus>();
let allEpochsCache: EpochStatus[] | null = null;
let currentEpochCache: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if cache is valid
function isCacheValid() {
  return Date.now() - cacheTimestamp < CACHE_TTL;
}

// Fetch all epoch statuses with caching
export async function fetchEpochStatus(): Promise<EpochStatus[]> {
  // Return cached data if valid
  if (allEpochsCache && isCacheValid()) {
    return allEpochsCache;
  }

  const db = getFirestoreDb();
  const epochsRef = collection(db, 'refund_sender_metadata');
  const epochsQuery = query(epochsRef);

  const snapshot = await getDocs(epochsQuery);
  const epochs: EpochStatus[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const epoch = {
      epoch: Number.parseInt(doc.id),
      refundSent: data.refundSent || false,
      totalRefunds: data.totalRefunds || 0,
      validatorsPaid: data.validatorsPaid || [],
      lastUpdated: data.lastUpdated,
    };

    epochs.push(epoch);

    // Also update the individual epoch cache
    epochCache.set(epoch.epoch, epoch);
  });

  // Update cache
  allEpochsCache = epochs;
  cacheTimestamp = Date.now();

  return epochs;
}

// Get current epoch (highest epoch in the database) with caching
export async function getCurrentEpoch(): Promise<number> {
  // Return cached data if valid
  if (currentEpochCache !== null && isCacheValid()) {
    return currentEpochCache;
  }

  const db = getFirestoreDb();
  const epochsRef = collection(db, 'refund_sender_metadata');
  const epochsQuery = query(epochsRef, orderBy('__name__', 'desc'), limit(1));

  const snapshot = await getDocs(epochsQuery);

  if (snapshot.empty) {
    currentEpochCache = 577; // Default starting epoch if no data
    return 577;
  }

  const currentEpoch = Number.parseInt(snapshot.docs[0].id);

  // Update cache
  currentEpochCache = currentEpoch;
  cacheTimestamp = Date.now();

  return currentEpoch;
}

// Fetch a specific epoch's details with caching
export async function fetchEpochDetails(
  epoch: number
): Promise<EpochStatus | null> {
  // Check cache first
  if (epochCache.has(epoch) && isCacheValid()) {
    return epochCache.get(epoch) || null;
  }

  const db = getFirestoreDb();
  const epochRef = doc(db, 'refund_sender_metadata', epoch.toString());

  const snapshot = await getDoc(epochRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  const epochData = {
    epoch,
    refundSent: data.refundSent || false,
    totalRefunds: data.totalRefunds || 0,
    validatorsPaid: data.validatorsPaid || [],
    lastUpdated: data.lastUpdated,
  };

  // Update cache
  epochCache.set(epoch, epochData);

  return epochData;
}

// Batch fetch validators by pubkeys
export async function fetchValidatorsByPubkeys(
  db: Firestore,
  pubkeys: string[]
): Promise<Map<string, any>> {
  const result = new Map<string, any>();

  // Process in batches of 10 (Firestore "in" query limit)
  for (let i = 0; i < pubkeys.length; i += 10) {
    const batch = pubkeys.slice(i, i + 10);

    if (batch.length === 0) continue;

    const validatorsQuery = query(
      collection(db, 'validators'),
      where('__name__', 'in', batch)
    );

    const validatorsSnap = await getDocs(validatorsQuery);
    validatorsSnap.forEach((doc) => {
      result.set(doc.id, {
        pubkey: doc.id,
        ...doc.data(),
      });
    });
  }

  return result;
}

// Paginated fetch of validators
export async function fetchValidatorsPaginated(
  db: Firestore,
  pageSize = 100,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
) {
  let validatorsQuery;

  if (lastDoc) {
    validatorsQuery = query(
      collection(db, 'validators'),
      orderBy('name'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  } else {
    validatorsQuery = query(
      collection(db, 'validators'),
      orderBy('name'),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(validatorsQuery);

  const validators = snapshot.docs.map((doc) => ({
    pubkey: doc.id,
    ...doc.data(),
  }));

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];
  const hasMore = snapshot.docs.length === pageSize;

  return {
    validators,
    lastDoc: lastVisible,
    hasMore,
  };
}
