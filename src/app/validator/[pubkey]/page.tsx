'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/lib/context/FirebaseProvider';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';

// Type for Firestore rewards
interface RewardEntry {
  epoch: number;
  amount: number;
  signature: string;
  slot: number;
  timestamp: any;
  from: string;
}

interface DisplayEpoch {
  epoch: number;
  reward?: RewardEntry;
  refundSent: boolean;
}

export default function ValidatorDetailPage() {
  const rawParams = useParams();
  const pubkey = Array.isArray(rawParams.pubkey)
    ? rawParams.pubkey[0]
    : rawParams.pubkey;
  const { validators, db, loadingValidators } = useFirebase();
  const [epochList, setEpochList] = useState<DisplayEpoch[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatorName, setValidatorName] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!pubkey || loadingValidators || !db) return;

      const validator = validators.find((v) => v.pubkey === pubkey);
      if (validator?.name) setValidatorName(validator.name);

      try {
        const rewardsSnap = await getDoc(doc(db, 'validator_rewards', pubkey));
        if (rewardsSnap.exists()) {
          const data = rewardsSnap.data();
          const rewards: RewardEntry[] = Array.isArray(data.rewards)
            ? data.rewards
            : [];

          const epochs = rewards.map((r) => r.epoch);
          const minEpoch = Math.min(...epochs);
          const maxEpoch = Math.max(...epochs);

          const display: DisplayEpoch[] = [];

          for (let e = minEpoch; e <= maxEpoch; e++) {
            const reward = rewards.find((r) => r.epoch === e);
            if (reward) {
              display.push({ epoch: e, reward, refundSent: true });
            } else {
              display.push({ epoch: e, refundSent: false });
            }
          }

          setEpochList(display);
        }
      } catch (err) {
        console.error('Error loading validator rewards:', err);
      }

      setLoading(false);
    }

    loadData();
  }, [pubkey, validators, db, loadingValidators]);

  return (
    <div className='min-h-screen bg-background text-foreground p-6 max-w-6xl mx-auto'>
      <nav className='mb-6'>
        <Link href='/' className='text-sm text-blue-500 hover:underline'>
          ← Back to Epoch Grid
        </Link>
      </nav>

      <h1 className='text-2xl font-bold mb-2'>Validator Rewards</h1>
      <div className='text-muted-foreground text-sm mb-6'>
        {validatorName || pubkey}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : epochList.length === 0 ? (
        <p className='text-muted-foreground'>
          No rewards found for this validator.
        </p>
      ) : (
        <div className='grid grid-cols-[repeat(auto-fit,_minmax(5rem,1fr))] gap-3 sm:gap-4 md:gap-5'>
          {epochList.map((e) => (
            <div
              key={e.epoch}
              className={`
                aspect-square rounded text-white text-center p-2 text-sm flex flex-col justify-center items-center cursor-pointer shadow-md
                ${
                  e.refundSent
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }
              `}
              title={`Epoch ${e.epoch} ${
                e.refundSent ? `- ${e.reward!.amount} lamports` : '- No refund'
              }`}>
              <div className='text-xl font-bold'>{e.epoch}</div>
              {e.refundSent ? (
                <div className='text-xs'>
                  {(e.reward!.amount / 1e9).toFixed(2)} SOL
                </div>
              ) : (
                <div className='text-xs'>No refund</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
