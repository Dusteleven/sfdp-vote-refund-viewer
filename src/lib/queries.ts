// src/lib/queries.ts
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const connection = new Connection(
  process.env.NEXT_PUBLIC_HELIUS_RPC!,
  'confirmed'
);

export interface EpochStatus {
  epoch: number;
  refundSent: boolean;
  totalRefunds: number;
}

export async function fetchValidatorRewards() {
  const snapshot = await getDocs(collection(db, 'validator_rewards'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getCurrentEpoch(): Promise<number> {
  const epochInfo = await connection.getEpochInfo();
  return epochInfo.epoch;
}

export async function fetchEpochStatus(): Promise<EpochStatus[]> {
  const snapshot = await getDocs(collection(db, 'refund_sender_metadata'));
  return snapshot.docs.map(doc => ({
    // @ts-ignore
    epoch: parseInt(doc.id),
    ...(doc.data() as EpochStatus),
  }));
}
