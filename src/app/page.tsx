'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchEpochStatus,
  type EpochStatus,
  getCurrentEpoch,
} from '@/lib/queries';
import { useTheme } from '@/lib/useTheme';
import {
  Search,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { EpochDetailModal } from '@/app/components/epoch-detail-modal';

type DisplayEpoch = {
  epoch: number;
  refundSent: boolean;
  totalRefunds?: number;
  isLow?: boolean;
};

export default function HomePage() {
  const [epochList, setEpochList] = useState<DisplayEpoch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    refundSent: 0,
    noRefund: 0,
    anomalies: 0,
    currentEpoch: 0,
  });
  const { theme, setTheme, mounted } = useTheme();

  // Modal state
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [firestoreEpochs, currentEpoch] = await Promise.all([
          fetchEpochStatus(),
          getCurrentEpoch(),
        ]);

        const epochMap = new Map<number, EpochStatus>();
        firestoreEpochs.forEach((e) => epochMap.set(e.epoch, e));

        const fullEpochs = Array.from(
          { length: currentEpoch - 577 + 1 },
          (_, i) => 577 + i
        );

        const display = fullEpochs.map((epoch) => {
          const data = epochMap.get(epoch);
          return {
            epoch,
            refundSent: !!data,
            totalRefunds: data?.totalRefunds,
            isLow: false,
          };
        });

        // 1️⃣ First pass — basic low refund detection
        // 🔁 Rolling average of previous 10 refund-sent epochs
        const thresholdPercent = 0.6;
        const rollingWindow: number[] = [];
        let anomalyCount = 0;
        let refundSentCount = 0;

        for (let i = 0; i < display.length; i++) {
          const curr = display[i];

          if (curr.refundSent && curr.totalRefunds !== undefined) {
            if (curr.totalRefunds > 0) refundSentCount++;

            if (rollingWindow.length >= 10) {
              rollingWindow.shift(); // Keep last 10
            }

            const avg =
              rollingWindow.length > 0
                ? rollingWindow.reduce((a, b) => a + b, 0) /
                  rollingWindow.length
                : undefined;

            if (avg && curr.totalRefunds < avg * thresholdPercent) {
              curr.isLow = true;
              anomalyCount++;
            }

            rollingWindow.push(curr.totalRefunds);

            if(curr.totalRefunds === 0) {
              curr.isLow = false;
              curr.refundSent = false;
              anomalyCount--;
            }
          }
        }

        setStats({
          total: display.length,
          refundSent: refundSentCount,
          noRefund: display.length - refundSentCount,
          anomalies: anomalyCount,
          currentEpoch,
        });

        setEpochList(display);
      } catch (error) {
        console.error('Failed to load epoch data:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // In the HomePage component, add a useEffect to reset selectedEpoch when modal closes
  // Add this after the existing useEffect
  useEffect(() => {
    if (!isModalOpen) {
      // Small delay to ensure the modal is fully closed before resetting
      const timer = setTimeout(() => {
        setSelectedEpoch(null);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const handleEpochClick = (epoch: number) => {
    setSelectedEpoch(epoch);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!mounted) return null; // 🛑 Prevent rendering until theme is mounted

  return (
    <main className='w-full'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight mb-4'>
            Solana Epoch Refund Tracker
          </h1>
          <p className='text-gray-500 dark:text-gray-400 max-w-3xl'>
            Track validator reward refunds across Solana epochs. View the status
            of refunds, identify anomalies, and search for specific validators
            to analyze their reward history.
          </p>
        </div>

        {loading ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <div className='w-12 h-12 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin'></div>
            <p className='mt-4 text-gray-500 dark:text-gray-400'>
              Loading epoch data...
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Current Epoch
                    </p>
                    <h3 className='text-2xl font-bold mt-1'>
                      {stats.currentEpoch}
                    </h3>
                  </div>
                  <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
                    <Info
                      size={20}
                      className='text-blue-600 dark:text-blue-400'
                    />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Refunds Sent
                    </p>
                    <h3 className='text-2xl font-bold mt-1'>
                      {stats.refundSent}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {Math.round((stats.refundSent / stats.total) * 100)}% of
                      total epochs
                    </p>
                  </div>
                  <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-full'>
                    <CheckCircle
                      size={20}
                      className='text-green-600 dark:text-green-400'
                    />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      No Refunds
                    </p>
                    <h3 className='text-2xl font-bold mt-1'>
                      {stats.noRefund}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {Math.round((stats.noRefund / stats.total) * 100)}% of
                      total epochs
                    </p>
                  </div>
                  <div className='p-2 bg-red-100 dark:bg-red-900/30 rounded-full'>
                    <XCircle
                      size={20}
                      className='text-red-600 dark:text-red-400'
                    />
                  </div>
                </div>
              </div>

              <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Anomalies
                    </p>
                    <h3 className='text-2xl font-bold mt-1'>
                      {stats.anomalies}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      {Math.round((stats.anomalies / stats.refundSent) * 100)}%
                      of refund epochs
                    </p>
                  </div>
                  <div className='p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full'>
                    <AlertTriangle
                      size={20}
                      className='text-yellow-600 dark:text-yellow-400'
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
              {/* Legend */}
              <div className='flex flex-wrap items-center gap-4 text-sm'>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-green-600 rounded' />
                  <span>Refund Sent</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-yellow-500 rounded' />
                  <span>Anomaly (Low)</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 bg-red-600 rounded' />
                  <span>No Refund</span>
                </div>
              </div>

              <Link
                href='/search'
                className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium'>
                <Search size={16} />
                Search Validators
              </Link>
            </div>

            {/* Grid */}
            <div
              className='
              grid gap-3 sm:gap-4 md:gap-5
              grid-cols-[repeat(auto-fill,_minmax(5rem,_1fr))]
              sm:grid-cols-[repeat(auto-fill,_minmax(6rem,_1fr))]
              md:grid-cols-[repeat(auto-fill,_minmax(7rem,_1fr))]
            '>
              {epochList.map((e) => (
                <div
                  key={e.epoch}
                  className={`
                    aspect-square
                    rounded-xl p-2 text-center shadow-md transition-all
                    flex flex-col justify-center items-center
                    text-xs sm:text-sm font-semibold
                    text-white
                    hover:scale-105 hover:shadow-lg
                    cursor-pointer
                    ${
                      e.refundSent
                        ? e.isLow
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }
                  `}
                  title={`Epoch ${e.epoch} — ${
                    e.refundSent
                      ? e.isLow
                        ? 'Low Refunds'
                        : 'Refund Sent'
                      : 'No Refund'
                  }`}
                  onClick={() => handleEpochClick(e.epoch)}>
                  <div className='text-lg md:text-xl font-bold'>{e.epoch}</div>
                  {e.refundSent ? (
                    <div className='mt-1 leading-tight'>
                      {e.totalRefunds} refunds
                    </div>
                  ) : (
                    <div className='mt-2 text-xs italic opacity-90'>
                      No refunds
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Epoch Detail Modal */}
            <EpochDetailModal
              isOpen={isModalOpen}
              onClose={closeModal}
              epoch={selectedEpoch}
            />
          </>
        )}
      </div>
    </main>
  );
}
