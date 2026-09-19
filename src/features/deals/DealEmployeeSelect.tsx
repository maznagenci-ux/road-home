'use client';

import { useEffect, useState } from 'react';

type EmployeeOption = { id: string; name: string; role: string };

export function DealEmployeeSelect({
  value,
  onChange,
  label,
  hint,
  placeholder,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  const [items, setItems] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch('/api/users/directory');
      if (!cancelled && res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <select
        className={className}
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? '—'}</option>
        {items.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{hint}</p> : null}
    </div>
  );
}
