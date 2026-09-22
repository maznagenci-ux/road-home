'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Plus, ShoppingCart, ExternalLink } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import type { Dictionary } from '@/i18n/dictionaries';

type HouseOpt = { code: string; name: string; unitNumber: string | null };

type PurchaseRow = {
  id: string;
  voucherNo: string;
  houseCode: string | null;
  houseName: string | null;
  unitNumber: string | null;
  buyerName: string | null;
  partyName: string;
  amountIqd: number;
  note: string | null;
  attachmentUrl: string | null;
  paymentMethod: string;
  createdAt: string;
  createdBy: string | null;
};

const field =
  'rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 w-full';

export function MaterialPurchasesView({ t, lang }: { t: Dictionary; lang: string }) {
  const m = t.pages.materialPurchases;
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const fileRef = useRef<HTMLInputElement>(null);

  const [houses, setHouses] = useState<HouseOpt[]>([]);
  const [items, setItems] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const [houseCode, setHouseCode] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentLabel, setAttachmentLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, pRes] = await Promise.all([
        fetch('/api/houses'),
        fetch('/api/material-purchases'),
      ]);
      if (hRes.ok) {
        const data = await hRes.json();
        const list: HouseOpt[] = (data.items ?? data.houses ?? []).map(
          (h: { code: string; name: string; unitNumber?: string | null }) => ({
            code: h.code,
            name: h.name,
            unitNumber: h.unitNumber ?? null,
          }),
        );
        setHouses(list);
        setHouseCode((prev) => prev || list[0]?.code || '');
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!res.ok) {
        setError(m?.uploadError ?? 'بارکردنی وەسڵ سەرنەکەوت');
        return;
      }
      const data = await res.json();
      setAttachmentUrl(data.url);
      setAttachmentLabel(file.name);
    } catch {
      setError(m?.uploadError ?? 'بارکردنی وەسڵ سەرنەکەوت');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);
    if (!houseCode || !buyerName.trim() || !partyName.trim() || !amount) {
      setError(m?.required ?? 'تکایە خانە پێویستەکان پڕ بکەوە');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/material-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseCode,
          buyerName: buyerName.trim(),
          partyName: partyName.trim(),
          amount: Number(amount),
          currency,
          exchangeRate: usdToIqd,
          paymentMethod: 'CASH_VAULT',
          note: note.trim() || null,
          attachmentUrl,
        }),
      });
      if (!res.ok) {
        setError(m?.error ?? 'تۆمارکردن سەرنەکەوت');
        return;
      }
      setOk(true);
      setBuyerName('');
      setPartyName('');
      setAmount('');
      setNote('');
      setAttachmentUrl(null);
      setAttachmentLabel(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch {
      setError(m?.error ?? 'تۆمارکردن سەرنەکەوت');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {m?.title ?? 'کرینی کەرسە'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {m?.subtitle ?? 'بۆ کام خانوو، کێ کڕی، بڕ، شوێن، و وەسڵ'}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShoppingCart className="h-4 w-4 text-primary" />
          {m?.add ?? 'کڕینی نوێ'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{m?.house ?? 'خانوو'}</span>
            <select
              className={field}
              value={houseCode}
              onChange={(e) => setHouseCode(e.target.value)}
            >
              <option value="">{m?.selectHouse ?? 'هەڵبژاردنی خانوو'}</option>
              {houses.map((h) => (
                <option key={h.code} value={h.code}>
                  {h.code}
                  {h.unitNumber ? ` · #${h.unitNumber}` : ''} — {h.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{m?.buyer ?? 'کێ کڕیویەتی'}</span>
            <input
              className={field}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder={m?.buyerPlaceholder ?? 'ناوی کەسەکە'}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{m?.vendor ?? 'لە کوێ کڕدرا'}</span>
            <input
              className={field}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder={m?.vendorPlaceholder ?? 'ناوی دوکان / دابینکەر'}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{m?.amount ?? 'بڕی پارە'}</span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                className={cn(field, 'tabular-nums flex-1')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <select
                className={cn(field, 'w-24')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'IQD' | 'USD')}
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-muted-foreground">{m?.note ?? 'وەسف / تێبینی'}</span>
            <input
              className={field}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={m?.notePlaceholder ?? 'چی کڕدرا؟'}
            />
          </label>

          <div className="sm:col-span-2 space-y-1.5">
            <span className="text-xs text-muted-foreground">{m?.receipt ?? 'وەسڵ'}</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadReceipt(f);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border bg-muted hover:bg-muted/80"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                {m?.uploadReceipt ?? 'بارکردنی وەسڵ'}
              </button>
              {attachmentLabel ? (
                <span className="text-xs text-foreground truncate max-w-[240px]" dir="ltr">
                  {attachmentLabel}
                </span>
              ) : null}
              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {m?.viewReceipt ?? 'بینین'}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {ok ? <p className="text-sm text-emerald-600">{m?.saved ?? 'تۆمارکرا'}</p> : null}

        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {m?.save ?? 'تۆمارکردن'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{m?.list ?? 'کڕینە تۆمارکراوەکان'}</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border p-8 text-center">
            {m?.empty ?? 'هیچ کڕینێک تۆمار نەکراوە'}
          </p>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card">
            {items.map((row) => (
              <div
                key={row.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-primary font-medium" dir="ltr">
                    {row.houseCode ?? '—'}
                    {row.unitNumber ? ` · #${row.unitNumber}` : ''}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {m?.buyer ?? 'کڕیار'}:{' '}
                    <span className="text-foreground">{row.buyerName || '—'}</span>
                    {' · '}
                    {m?.vendor ?? 'شوێن'}:{' '}
                    <span className="text-foreground">{row.partyName}</span>
                  </p>
                  {row.note ? (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{row.note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-end">
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(row.amountIqd, lang)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(row.createdAt, lang)}
                    </p>
                  </div>
                  {row.attachmentUrl ? (
                    <a
                      href={row.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
                      title={m?.viewReceipt ?? 'وەسڵ'}
                    >
                      <Paperclip className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
