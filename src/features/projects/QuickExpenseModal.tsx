'use client';

import { useEffect, useState } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import { EXPENSE_CATEGORIES, categoryLabel } from './labels';
import type { Dictionary } from '@/i18n/dictionaries';

type HouseOption = { code: string; name: string };

export function QuickExpenseModal({
  t,
  open,
  onClose,
  defaultHouseCode,
  houses,
  onCreated,
}: {
  t: Dictionary;
  open: boolean;
  onClose: () => void;
  defaultHouseCode?: string;
  houses: HouseOption[];
  onCreated?: () => void;
}) {
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const [houseCode, setHouseCode] = useState(defaultHouseCode ?? '');
  const [accountType, setAccountType] = useState<'EXPENSE' | 'VENDOR_PAYMENT'>('EXPENSE');
  const [category, setCategory] = useState<string>('STEEL');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_VAULT' | 'CREDIT'>('CASH_VAULT');
  const [partyName, setPartyName] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (open) {
      setHouseCode(defaultHouseCode ?? houses[0]?.code ?? '');
      setError('');
      setOk(false);
    }
  }, [open, defaultHouseCode, houses]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk(false);

    if (!houseCode || !partyName || !amount) {
      setError(t.pages.projects.required);
      return;
    }
    if (paymentMethod === 'CREDIT' && accountType === 'EXPENSE' && !dueDate) {
      setError(t.pages.projects.required);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseCode,
          accountType,
          category: accountType === 'EXPENSE' ? category : null,
          amount: Number(amount),
          currency,
          exchangeRate: usdToIqd,
          paymentMethod,
          partyName,
          note: note || null,
          attachmentUrl: attachmentName ? `local://${attachmentName}` : null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      if (!res.ok) {
        setError(t.pages.projects.error);
        return;
      }
      setOk(true);
      setAmount('');
      setNote('');
      setAttachmentName(null);
      onCreated?.();
      setTimeout(() => onClose(), 700);
    } catch {
      setError(t.pages.projects.error);
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sidebar/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <h2 className="text-base font-semibold text-foreground">{t.pages.projects.addExpense}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label={t.common.close}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.houseCode}</label>
            <select className={field} value={houseCode} onChange={(e) => setHouseCode(e.target.value)} required>
              <option value="">{t.pages.projects.selectHouse}</option>
              {houses.map((h) => (
                <option key={h.code} value={h.code}>
                  {h.code} — {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.accountType}</label>
              <select
                className={field}
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as typeof accountType)}
              >
                <option value="EXPENSE">{t.nav.expenses}</option>
                <option value="VENDOR_PAYMENT">{t.dashboard.vendorDebts}</option>
              </select>
            </div>
            {accountType === 'EXPENSE' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{t.dashboard.category}</label>
                <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(t, c)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.amount}</label>
              <input
                type="number"
                min="0"
                step="any"
                className={cn(field, 'tabular-nums')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.currency}</label>
              <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value as 'IQD' | 'USD')}>
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t.pages.projects.fxLocked}: $1 = {usdToIqd.toLocaleString('en-US')} IQD
          </p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.partyName}</label>
            <input className={field} value={partyName} onChange={(e) => setPartyName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">{t.dashboard.paymentStatus}</label>
              <select
                className={field}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              >
                <option value="CASH_VAULT">{t.pages.projects.paymentCash}</option>
                <option value="CREDIT">{t.pages.projects.paymentCredit}</option>
              </select>
            </div>
            {paymentMethod === 'CREDIT' && accountType === 'EXPENSE' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.dueDate}</label>
                <input type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.note}</label>
            <textarea className={cn(field, 'min-h-[72px] resize-y')} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.projects.attachment}</label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/60 px-4 py-6 cursor-pointer hover:border-emerald-500/40 transition-colors">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground text-center">
                {attachmentName ?? t.pages.projects.attachmentHint}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}
          {ok && <p className="text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">{t.pages.projects.created}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm border border-border text-foreground/80 hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.pages.projects.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
