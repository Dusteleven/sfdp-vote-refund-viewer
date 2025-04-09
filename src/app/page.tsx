'use client';

import { useEffect, useState } from 'react';
import {
  fetchEpochStatus,
  EpochStatus,
  getCurrentEpoch,
} from '@/lib/queries';
import { useTheme } from '@/lib/useTheme';

type DisplayEpoch = {
  epoch: number;
  refundSent: boolean;
  totalRefunds?: number;
  isLow?: boolean;
};

export default function HomePage() {
  const [epochList, setEpochList] = useState<DisplayEpoch[]>([]);
  const { theme, setTheme, mounted } = useTheme();

  useEffect(() => {
    async function load() {
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
          isLow: false
        };
      });

      // 1️⃣ First pass — basic low refund detection
      // 🔁 Rolling average of previous 10 refund-sent epochs
      const thresholdPercent = 0.6;
      const rollingWindow: number[] = [];

      for (let i = 0; i < display.length; i++) {
        const curr = display[i];

        if (curr.refundSent && curr.totalRefunds !== undefined) {
          if (rollingWindow.length >= 10) {
            rollingWindow.shift(); // Keep last 10
          }

          const avg =
            rollingWindow.length > 0
              ? rollingWindow.reduce((a, b) => a + b, 0) / rollingWindow.length
              : undefined;

          if (avg && curr.totalRefunds < avg * thresholdPercent) {
            curr.isLow = true;
          }

          rollingWindow.push(curr.totalRefunds);
        }
      }

      setEpochList(display);
    }

    load();
  }, []);

  if (!mounted) return null; // 🛑 Prevent rendering until theme is mounted

  return (
    <main className='p-6 sm:p-8 md:p-10 lg:p-12 max-w-screen-2xl mx-auto font-sans'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-800 dark:text-gray-100'>
          Solana Epoch Refund Tracker
        </h1>
      </div>

      {/* Legend */}
      <div className='mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300'>
        <div className='flex items-center gap-2'>
          <div className='w-4 h-4 bg-green-600 rounded' /> Refund Sent
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-4 h-4 bg-yellow-500 rounded' /> Anomaly (Low)
        </div>
        <div className='flex items-center gap-2'>
          <div className='w-4 h-4 bg-red-600 rounded' /> No Refund
        </div>
      </div>

      {/* Grid */}
      <div
        className='
        grid gap-3 sm:gap-4 md:gap-5 lg:gap-6
        grid-cols-[repeat(auto-fit,_minmax(6rem,_1fr))]
      '>
        {epochList.map((e) => (
          <div
            key={e.epoch}
            className={`
              aspect-square min-w-[6rem] max-w-full
              rounded-xl p-2 text-center shadow-lg transition-all
              flex flex-col justify-center items-center
              text-xs sm:text-sm md:text-base font-semibold
              text-white
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
            }`}>
            <div className='text-lg md:text-xl font-bold'>{e.epoch}</div>
            {e.refundSent ? (
              <div className='mt-1 leading-tight'>{e.totalRefunds} refunds</div>
            ) : (
              <div className='mt-2 text-sm italic opacity-90'>No refunds</div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
