'use client';

import type React from 'react';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useFirebase } from '@/lib/context/FirebaseProvider';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

export default function SearchValidatorPage() {
  const router = useRouter();
  const [validatorKey, setValidatorKey] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { validators, loadingValidators, db } = useFirebase();
  const [searchIndex, setSearchIndex] = useState<Fuse<any> | null>(null);

  // Create search index when validators change
  useEffect(() => {
    if (validators.length > 0) {
      const fuse = new Fuse(validators, {
        keys: ['pubkey', 'name'],
        threshold: 0.3,
      });
      setSearchIndex(fuse);
    }
  }, [validators]);

  // Debounced search function
  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      try {
        // First try to search in already loaded validators
        let found: any[] = [];

        if (searchIndex) {
          found = searchIndex
            .search(searchTerm)
            .slice(0, 8)
            .map((r) => r.item);
        }

        // If the search term looks like a pubkey (long string) and we didn't find it in loaded validators,
        // try to fetch it directly from Firestore
        if (found.length === 0 && searchTerm.length > 30 && db) {
          // This might be a pubkey, try to fetch it directly
          const validatorDoc = await getDoc(doc(db, 'validators', searchTerm));

          if (validatorDoc.exists()) {
            found = [
              {
                pubkey: validatorDoc.id,
                ...validatorDoc.data(),
              },
            ];
          }
        }

        setResults(found);
      } catch (error) {
        console.error('Error searching validators:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [searchIndex, db]
  );

  // Handle search input changes with debounce
  useEffect(() => {
    if (validatorKey.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(validatorKey);
    }, 300);

    return () => clearTimeout(timer);
  }, [validatorKey, performSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validatorKey.trim()) {
      router.push(`/validator/${validatorKey.trim()}`);
    }
  }

  return (
    <div className='max-w-4xl mx-auto px-4 py-8'>
      <Link
        href='/'
        className='inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors'>
        <ArrowLeft className='h-4 w-4 mr-1' /> Back to Epoch Grid
      </Link>

      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-4'>Search Validator</h1>
        <p className='text-gray-500 dark:text-gray-400'>
          Enter a validator public key or name to view their reward history
          across epochs.
        </p>
      </div>

      <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-sm'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
              <Search className='h-5 w-5 text-gray-400 dark:text-gray-500' />
            </div>
            <input
              type='text'
              placeholder='Enter validator identity pubkey or name'
              value={validatorKey}
              onChange={(e) => setValidatorKey(e.target.value)}
              className='w-full pl-10 pr-4 py-3 rounded-md border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
            />
          </div>
          <button
            type='submit'
            disabled={validatorKey.trim().length === 0}
            className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md shadow transition-colors font-medium'>
            Search Validator
          </button>
        </form>

        {loadingValidators && validators.length === 0 && (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 text-blue-600 animate-spin' />
            <span className='ml-2 text-gray-500 dark:text-gray-400'>
              Loading validators...
            </span>
          </div>
        )}

        {isSearching && (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 text-blue-600 animate-spin' />
            <span className='ml-2 text-gray-500 dark:text-gray-400'>
              Searching...
            </span>
          </div>
        )}

        {!isSearching &&
          !loadingValidators &&
          validatorKey.length >= 2 &&
          results.length === 0 && (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              No validators found matching "{validatorKey}"
            </div>
          )}

        {results.length > 0 && (
          <div className='mt-6'>
            <h2 className='text-lg font-medium mb-3'>Search Results</h2>
            <ul className='border border-gray-200 dark:border-gray-800 rounded-md shadow-sm divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 overflow-hidden'>
              {results.map((v: any) => (
                <li
                  key={v.pubkey}
                  className='p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                  onClick={() => router.push(`/validator/${v.pubkey}`)}>
                  <div className='font-semibold'>
                    {v.name || 'Unnamed Validator'}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-1'>
                    {v.pubkey}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
