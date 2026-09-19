'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProjectProfileView } from './ProjectProfileView';
import type { Dictionary } from '@/i18n/dictionaries';

export function ProjectProfileClient({
  t,
  lang,
  code,
}: {
  t: Dictionary;
  lang: string;
  code: string;
}) {
  const [data, setData] = useState<Parameters<typeof ProjectProfileView>[0]['data'] | null>(null);
  const [houses, setHouses] = useState<Array<{ code: string; name: string }>>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const [projRes, listRes] = await Promise.all([
      fetch(`/api/projects/${encodeURIComponent(code)}`),
      fetch('/api/projects'),
    ]);
    if (!projRes.ok) {
      setError(t.errors.notFound);
      return;
    }
    const proj = await projRes.json();
    setData(proj);
    if (listRes.ok) {
      const list = await listRes.json();
      setHouses((list.items ?? []).map((i: { code: string; name: string }) => ({ code: i.code, name: i.name })));
    }
  }, [code, t.errors.notFound]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="text-rose-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-muted-foreground">{t.common.loading}</p>;
  }

  return (
    <ProjectProfileView
      t={t}
      lang={lang}
      data={data}
      houses={houses.length ? houses : [{ code: data.project.code, name: data.project.name }]}
      onRefresh={() => void load()}
    />
  );
}
