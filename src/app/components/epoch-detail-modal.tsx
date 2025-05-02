'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/modal';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useFirebase } from '@/lib/context/FirebaseProvider';
import { Loader2, ExternalLink } from 'lucide-react';

interface EpochDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  epoch: number | null;
  validatorPubkey?: string; // Optional - only provided on validator detail page
}

interface EpochMetadata {
  refundSent: boolean;
  totalRefunds: number;
  validatorsPaid: string[];
  lastUpdated: any;
}

interface ValidatorReward {
  epoch: number;
  amount: number;
  signature: string;
  slot?: number;
  timestamp: any;
  from: string;
  issues?: string[];
  reason?: string;
}

export function EpochDetailModal({
  isOpen,
  onClose,
  epoch,
  validatorPubkey,
}: EpochDetailModalProps) {
  const { db } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [epochData, setEpochData] = useState<EpochMetadata | null>(null);
  const [validatorReward, setValidatorReward] =
    useState<ValidatorReward | null>(null);
  const [validatorNames, setValidatorNames] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    async function fetchData() {
      if (!isOpen || !epoch || !db) return;

      setLoading(true);
      setValidatorReward(null); // Reset validator reward
      setEpochData(null); // Reset epoch data to prevent showing stale data

      try {
        // Fetch epoch metadata
        const epochRef = doc(db, 'refund_sender_metadata', epoch.toString());
        const epochSnap = await getDoc(epochRef);

        if (epochSnap.exists()) {
          setEpochData(epochSnap.data() as EpochMetadata);

          // If we're on a validator detail page, fetch that validator's specific reward
          if (validatorPubkey) {
            const validatorRef = doc(db, 'validator_rewards', validatorPubkey);
            const validatorSnap = await getDoc(validatorRef);

            if (validatorSnap.exists()) {
              const data = validatorSnap.data();
              const rewards = data.rewards || [];

              // Find the specific reward for this epoch
              const reward = rewards.find(
                (r: ValidatorReward) => r.epoch === epoch
              );

              if (reward) {
                console.log('Found reward for epoch', epoch, reward);
                setValidatorReward(reward);
              } else {
                console.log('No reward found for epoch', epoch);
              }
            }
          }
          // If we're on the main page, fetch names for the validators that were paid
          else if (epochSnap.exists()) {
            const data = epochSnap.data() as EpochMetadata;
            const validatorIds = data.validatorsPaid || [];

            if (validatorIds.length > 0) {
              // Fetch validator names in batches to avoid large queries
              const names: Record<string, string> = {};

              // Process in batches of 10
              for (let i = 0; i < validatorIds.length; i += 10) {
                const batch = validatorIds.slice(i, i + 10);
                const validatorsQuery = query(
                  collection(db, 'validators'),
                  where('__name__', 'in', batch)
                );

                const validatorsSnap = await getDocs(validatorsQuery);
                validatorsSnap.forEach((doc) => {
                  const data = doc.data();
                  names[doc.id] = data.name || 'Unnamed Validator';
                });
              }

              setValidatorNames(names);
            }
          }
        } else {
          // If the epoch document doesn't exist, explicitly set epochData to null
          console.log('No data found for epoch', epoch);
          setEpochData(null);
        }
      } catch (error) {
        console.error('Error fetching epoch data:', error);
        setEpochData(null); // Reset on error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, epoch, db, validatorPubkey]);

  // Format timestamp to readable date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';

    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }

      // Handle string or number timestamp
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Generate Solana Explorer URL for transaction
  const getExplorerUrl = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}`;
  };

  // Format lamports to SOL
  const formatSol = (lamports: number) => {
    return (lamports / 1e9).toFixed(4);
  };

  // Truncate pubkey for display
  const truncatePubkey = (pubkey: string) => {
    if (!pubkey) return '';
    return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Epoch ${epoch} Details`}>
      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 text-blue-600 animate-spin' />
          <span className='ml-2 text-gray-500 dark:text-gray-400'>
            Loading epoch data...
          </span>
        </div>
      ) : !epochData ? (
        <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
          No data available for Epoch {epoch}
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Common epoch information */}
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-gray-50 dark:bg-gray-800 p-3 rounded-md'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Status
                </p>
                {validatorPubkey ? (
                  <p className='font-medium'>
                    {epochData.refundSent &&
                      validatorReward &&
                      !validatorReward.reason && (
                        <span className='text-green-600 dark:text-green-500'>
                          Refunds Sent
                        </span>
                      )}
                    {!validatorReward ||
                      (validatorReward.issues &&
                        validatorReward.issues[0] === 'NO_DATA' &&
                        !epochData.refundSent && (
                          <span className='text-red-600 dark:text-red-500'>
                            No Refunds
                          </span>
                        ))}
                    {!validatorReward ||
                      (validatorReward.issues &&
                        validatorReward.issues[0] === 'NO_DATA' &&
                        epochData.refundSent &&
                        validatorReward.amount <= 0 && (
                          <span className='text-red-600 dark:text-red-500'>
                            Missed or Missing
                          </span>
                        ))}
                    {epochData.refundSent &&
                      validatorReward &&
                      validatorReward.issues &&
                      validatorReward.issues.length > 0 &&
                      validatorReward.issues[0] !== 'NO_DATA' && (
                        <span className='text-yellow-600 dark:text-yellow-400'>
                          Not Eligible
                        </span>
                      )}
                  </p>
                ) : (
                  <p className='font-medium'>
                    {epochData.refundSent ? (
                      <span className='text-green-600 dark:text-green-500'>
                        Refunds Sent
                      </span>
                    ) : (
                      <span className='text-red-600 dark:text-red-500'>
                        No Refunds
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className='bg-gray-50 dark:bg-gray-800 p-3 rounded-md'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Total Refunds
                </p>
                <p className='font-medium'>{epochData.totalRefunds || 0}</p>
              </div>

              <div className='bg-gray-50 dark:bg-gray-800 p-3 rounded-md col-span-2'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Last Updated
                </p>
                <p className='font-medium'>
                  {formatDate(epochData.lastUpdated)}
                </p>
              </div>
            </div>
          </div>

          {/* Validator-specific information (only on validator detail page) */}
          {validatorPubkey && (
            <div>
              <h3 className='text-lg font-medium mb-3'>Validator Reward</h3>
              {validatorReward && epochData.totalRefunds > 0 ? (
                <div className='space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-md'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      Amount
                    </span>
                    <span className='font-medium'>
                      {formatSol(validatorReward.amount)} SOL
                    </span>
                  </div>

                  {validatorReward.slot !== undefined && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>
                        Slot
                      </span>
                      <span className='font-medium'>
                        {validatorReward.slot}
                      </span>
                    </div>
                  )}
                  {validatorReward.issues !== undefined &&
                  validatorReward.issues.length > 0 &&
                    validatorReward.issues[0] !== 'NO_DATA' && (
                      <div className='flex justify-between'>
                        <span className='text-gray-500 dark:text-gray-400'>
                          Not Eligible
                        </span>
                        <span className='font-medium'>
                          {validatorReward.issues.length > 1
                            ? validatorReward.issues?.join(', ')
                            : validatorReward.issues[0]}
                        </span>
                      </div>
                    )}

                  <div className='flex justify-between'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      From
                    </span>
                    <span className='font-mono text-sm'>
                      {truncatePubkey(validatorReward.from)}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      Timestamp
                    </span>
                    <span className='font-medium'>
                      {formatDate(validatorReward.timestamp)}
                    </span>
                  </div>
                  {validatorReward.signature.length > 0 && (
                    <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                      <a
                        href={getExplorerUrl(validatorReward.signature)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm'>
                        View Transaction{' '}
                        <ExternalLink size={14} className='ml-1' />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className='bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-center text-gray-500 dark:text-gray-400'>
                  No reward data found for this validator in Epoch {epoch}
                </div>
              )}
            </div>
          )}

          {/* List of validators paid (only on main page) */}
          {!validatorPubkey &&
            epochData.validatorsPaid &&
            epochData.validatorsPaid.length > 0 && (
              <div>
                <h3 className='text-lg font-medium mb-3'>
                  Validators Paid ({epochData.validatorsPaid.length})
                </h3>
                <div className='max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md divide-y divide-gray-200 dark:divide-gray-800'>
                  {epochData.validatorsPaid.map((pubkey) => (
                    <div
                      key={pubkey}
                      className='p-2 hover:bg-gray-50 dark:hover:bg-gray-800'>
                      <p className='font-medium'>
                        {validatorNames[pubkey] || 'Unnamed Validator'}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400 font-mono truncate'>
                        {pubkey}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </Modal>
  );
}
