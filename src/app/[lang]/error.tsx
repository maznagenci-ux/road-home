'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-5xl font-bold text-primary tabular-nums">500</p>
        <h1 className="text-xl font-semibold text-foreground">هەڵەیەک ڕووی دا</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          تکایە دووبارە هەوڵ بدە. ئەگەر کێشەکە بەردەوام بوو، پەیوەندی بە ئەدمین بکە.
        </p>
        {error.digest ? (
          <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">
            کۆد: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            دووبارە هەوڵبدە
          </button>
          <Link
            href="/ckb"
            className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-muted"
          >
            گەڕانەوە بۆ سەرەتا
          </Link>
        </div>
      </div>
    </div>
  );
}
