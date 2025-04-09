'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/lib/context/FirebaseProvider';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Copy, Loader2, CheckCircle } from 'lucide-react';
import { EpochDetailModal } from '@/app/components/epoch-detail-modal';

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
    : rawParams.pubkey || 'So11111111111111111111111111111111111111112';
  const { validators, db, loadingValidators } = useFirebase();
  const [epochList, setEpochList] = useState<DisplayEpoch[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatorName, setValidatorName] = useState('');
  const [stats, setStats] = useState({
    totalEpochs: 0,
    refundSent: 0,
    noRefund: 0,
    totalAmount: 0,
    avgAmount: 0,
  });
  const [copied, setCopied] = useState(false);

  // Modal state
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!pubkey || loadingValidators || !db) return;

      const validator = validators.find((v) => v.pubkey === pubkey);
      if (validator?.name) setValidatorName(validator.name);

      try {
        setLoading(true);
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

          // Calculate stats
          const totalAmount = rewards.reduce(
            (sum, reward) => sum + reward.amount,
            0
          );

          setStats({
            totalEpochs: display.length,
            refundSent: rewards.length,
            noRefund: display.length - rewards.length,
            totalAmount,
            avgAmount: rewards.length > 0 ? totalAmount / rewards.length : 0,
          });

          setEpochList(display);
        }
      } catch (err) {
        console.error('Error loading validator rewards:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [pubkey, validators, db, loadingValidators]);

  // In the ValidatorDetailPage component, add a useEffect to reset selectedEpoch when modal closes
  // Add this after the existing useEffect that loads data
  useEffect(() => {
    if (!isModalOpen) {
      // Small delay to ensure the modal is fully closed before resetting
      const timer = setTimeout(() => {
        setSelectedEpoch(null);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pubkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPubkey = (key: string) => {
    if (!key) return '';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleEpochClick = (epoch: number) => {
    setSelectedEpoch(epoch);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
      <Link
        href='/search'
        className='inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors'>
        <ArrowLeft className='h-4 w-4 mr-1' /> Back to Search
      </Link>

      <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden mb-8'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-800'>
          <h1 className='text-2xl font-bold mb-1'>Validator Details</h1>
          <div className='flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400'>
            <span className='font-medium'>
              {validatorName || 'Unnamed Validator'}
            </span>
            <span className='text-gray-400 dark:text-gray-500'>•</span>
            <div className='flex items-center'>
              <span className='font-mono text-sm'>{formatPubkey(pubkey)}</span>
              <button
                onClick={copyToClipboard}
                className='ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors'
                title='Copy full pubkey'>
                {copied ? (
                  <CheckCircle className='h-4 w-4 text-green-500' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center p-12'>
            <Loader2 className='h-8 w-8 text-blue-600 animate-spin' />
            <span className='ml-2 text-gray-500 dark:text-gray-400'>
              Loading validator data...
            </span>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6'>
              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  Total Epochs
                </p>
                <h3 className='text-2xl font-bold mt-1'>{stats.totalEpochs}</h3>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  Refunds Received
                </p>
                <h3 className='text-2xl font-bold mt-1'>{stats.refundSent}</h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {stats.totalEpochs > 0
                    ? Math.round((stats.refundSent / stats.totalEpochs) * 100)
                    : 0}
                  % of epochs
                </p>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  Total Rewards
                </p>
                <h3 className='text-2xl font-bold mt-1'>
                  {(stats.totalAmount / 1e9).toFixed(2)} SOL
                </h3>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4'>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                  Avg. Reward
                </p>
                <h3 className='text-2xl font-bold mt-1'>
                  {(stats.avgAmount / 1e9).toFixed(4)} SOL
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  Per epoch with refund
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className='px-6 pb-4 flex flex-wrap items-center gap-4 text-sm'>
              <div className='flex items-center gap-2'>
                <div className='w-4 h-4 bg-green-600 rounded' />
                <span>Refund Received</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-4 h-4 bg-red-600 rounded' />
                <span>No Refund</span>
              </div>
            </div>

            {/* Epoch Grid */}
            {epochList.length === 0 ? (
              <div className='p-6 text-center text-gray-500 dark:text-gray-400'>
                No rewards data found for this validator.
              </div>
            ) : (
              <div className='p-6 pt-0'>
                <div className='grid grid-cols-[repeat(auto-fill,_minmax(5rem,_1fr))] sm:grid-cols-[repeat(auto-fill,_minmax(6rem,_1fr))] gap-3 sm:gap-4'>
                  {epochList.map((e) => (
                    <div
                      key={e.epoch}
                      className={`
                        aspect-square rounded-lg text-white text-center p-2 text-sm flex flex-col justify-center items-center
                        shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer
                        ${
                          e.refundSent
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }
                      `}
                      title={`Epoch ${e.epoch} ${
                        e.refundSent
                          ? `- ${e.reward!.amount} lamports`
                          : '- No refund'
                      }`}
                      onClick={() => handleEpochClick(e.epoch)}>
                      <div className='text-lg font-bold'>{e.epoch}</div>
                      {e.refundSent ? (
                        <div className='text-xs mt-1'>
                          {(e.reward!.amount / 1e9).toFixed(4)} SOL
                        </div>
                      ) : (
                        <div className='text-xs mt-1 italic opacity-90'>
                          No refund
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Epoch Detail Modal */}
      <EpochDetailModal
        isOpen={isModalOpen}
        onClose={closeModal}
        epoch={selectedEpoch}
        validatorPubkey={pubkey}
      />
    </div>
  );
}
