'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ckb" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Noto Kufi Arabic', Tahoma, sans-serif",
          background: '#f1f5f9',
          color: '#0f2744',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 48, fontWeight: 800, margin: 0 }}>500</p>
          <h1 style={{ fontSize: 20, margin: '12px 0 8px' }}>هەڵەی سیستەم</h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            لاپەڕەکە بار نەبوو. دووبارە هەوڵ بدە یان دواتر بگەڕێوە.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: '#94a3b8', direction: 'ltr' }}>کۆد: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              border: 0,
              background: '#0f2744',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            دووبارە هەوڵبدە
          </button>
        </div>
      </body>
    </html>
  );
}
