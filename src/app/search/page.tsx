'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useFirebase } from '@/lib/context/FirebaseProvider';

export default function SearchValidatorPage() {
  const router = useRouter();
  const [validatorKey, setValidatorKey] = useState('');
  const [results, setResults] = useState([]);
  const { validators, loadingValidators } = useFirebase();

  useEffect(() => {
    if (validatorKey.length < 2 || loadingValidators) {
      setResults([]);
      return;
    }

    const fuse = new Fuse(validators, {
      keys: ['pubkey', 'name'],
      threshold: 0.3,
    });

    const found: any = fuse
      .search(validatorKey)
      .slice(0, 8)
      .map((r) => r.item);
    setResults(found);
  }, [validatorKey, validators, loadingValidators]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validatorKey.trim()) {
      router.push(`/validator/${validatorKey.trim()}`);
    }
  }

  return (
    <div className='min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto'>
      <nav className='mb-6'>
        <Link href='/' className='text-sm text-blue-500 hover:underline'>
          ← Back to Epoch Grid
        </Link>
      </nav>
      <h1 className='text-2xl font-bold mb-4'>Search Validator</h1>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <input
          type='text'
          placeholder='Enter validator identity pubkey'
          value={validatorKey}
          onChange={(e) => setValidatorKey(e.target.value)}
          className='w-full px-4 py-2 rounded border bg-background text-foreground border-muted focus:outline-none focus:ring-2 focus:ring-blue-400'
        />
        <button
          type='submit'
          className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow'>
          Search
        </button>
      </form>

      {results.length > 0 && (
        <ul className='mt-6 border rounded shadow divide-y bg-background overflow-hidden'>
          {results.map((v: any) => (
            <li
              key={v.pubkey}
              className='p-4 hover:bg-muted cursor-pointer'
              onClick={() => router.push(`/validator/${v.pubkey}`)}>
              <div className='font-semibold'>
                {v.name || 'Unnamed Validator'}
              </div>
              <div className='text-xs text-muted-foreground truncate'>
                {v.pubkey}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
