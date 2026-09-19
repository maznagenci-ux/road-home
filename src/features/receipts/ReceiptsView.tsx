'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Printer, FileDown, X, Loader2, MessageCircle, Search, Trash2 } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import { landlordRentReadyMessage, openWhatsApp } from '@/lib/whatsapp';
import type { Dictionary } from '@/i18n/dictionaries';

type ReceiptRow = {
  id: string;
  receiptNo: string;
  type: 'PAYMENT' | 'INCOME' | 'EXPENSE';
  partyName: string;
  currency: 'IQD' | 'USD';
  amount: number;
  totalAmount: number | null;
  remainingAmount: number | null;
  description: string | null;
  issuedAt: string;
  contractId: string | null;
  leaseId?: string | null;
  purpose?: 'GENERAL' | 'RENT' | 'SECURITY_DEPOSIT' | null;
  contract: { contractNo: string; title: string; buyerName: string | null } | null;
  lease?: { leaseNo: string; tenantName: string; propertyCode: string } | null;
};

type ContractOption = {
  id: string;
  contractNo: string;
  title: string;
  kind: string;
  currency: 'IQD' | 'USD';
  exchangeRate: number;
  totalAmount: number;
  totalAmountUsd: number;
  downPayment: number;
  downPaymentUsd: number;
  buyerName: string | null;
  sellerName: string | null;
  house: { code: string; name: string } | null;
  installments: { amount: number; status: string }[];
};

type FormState = {
  type: 'PAYMENT' | 'INCOME';
  contractId: string;
  partyName: string;
  currency: 'IQD' | 'USD';
  amount: string;
  totalAmount: string;
  remainingAmount: string;
  description: string;
};

const emptyForm = (): FormState => ({
  type: 'INCOME',
  contractId: '',
  partyName: '',
  currency: 'IQD',
  amount: '',
  totalAmount: '',
  remainingAmount: '',
  description: '',
});

function roundMoney(n: number, currency: 'IQD' | 'USD') {
  if (currency === 'USD') return Math.round(n * 100) / 100;
  return Math.round(n);
}

function fillFromContract(
  contract: ContractOption,
  type: FormState['type'],
): Pick<FormState, 'partyName' | 'currency' | 'amount' | 'totalAmount' | 'remainingAmount' | 'description'> {
  const currency = contract.currency === 'USD' ? 'USD' : 'IQD';
  const rate = Math.max(1, contract.exchangeRate || 150_000);
  const toCur = (iqd: number) => (currency === 'USD' ? iqd / rate : iqd);

  const total = roundMoney(
    currency === 'USD' ? contract.totalAmountUsd || toCur(contract.totalAmount) : contract.totalAmount,
    currency,
  );
  const down = roundMoney(
    currency === 'USD' ? contract.downPaymentUsd || toCur(contract.downPayment) : contract.downPayment,
    currency,
  );
  const installments = contract.installments ?? [];
  const paidInstallments = roundMoney(
    installments
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + toCur(i.amount), 0),
    currency,
  );
  const paid = down + paidInstallments;

  const pending = installments.find((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const suggested = pending
    ? roundMoney(toCur(pending.amount), currency)
    : roundMoney(Math.max(0, total - paid), currency);

  const remaining = roundMoney(Math.max(0, total - paid - suggested), currency);

  const partyName =
    type === 'INCOME'
      ? contract.buyerName?.trim() || contract.sellerName?.trim() || ''
      : contract.sellerName?.trim() || contract.buyerName?.trim() || '';

  const houseBit = contract.house ? ` · ${contract.house.code}` : '';
  const description = `${contract.contractNo} · ${contract.title}${houseBit}`;

  return {
    partyName,
    currency,
    amount: suggested > 0 ? String(suggested) : '',
    totalAmount: total > 0 ? String(total) : '',
    remainingAmount: String(remaining),
    description,
  };
}

export function ReceiptsView({ t, lang }: { t: Dictionary; lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stream = (searchParams.get('stream') || 'trading') as
    | 'trading'
    | 'rental'
    | 'deposit'
    | 'construction'
    | 'office';
  const usdToIqd = useFxStore((s) => s.usdToIqd);
  const [items, setItems] = useState<ReceiptRow[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'INCOME' | 'PAYMENT' | 'EXPENSE'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    ...emptyForm(),
    type: stream === 'construction' || stream === 'office' ? 'PAYMENT' : 'INCOME',
    currency: 'IQD',
  }));
  const [rentLeaseId, setRentLeaseId] = useState<string | null>(null);
  const [rentPeriod, setRentPeriod] = useState<string | null>(null);
  const [depositLeaseId, setDepositLeaseId] = useState<string | null>(null);
  const [depositTo, setDepositTo] = useState<'roadhome' | 'landlord' | 'tenant' | null>(null);
  const [landlordNotify, setLandlordNotify] = useState<{
    phone: string;
    name: string;
    propertyCode: string;
    amountLabel: string;
    period: string;
  } | null>(null);
  const [landlordPrompt, setLandlordPrompt] = useState<{
    phone: string;
    name: string;
    propertyCode: string;
    amountLabel: string;
    period: string;
  } | null>(null);

  const rc = t.pages.receipts as Record<string, string>;
  const rr = t.pages.rentals as Record<string, string>;
  const n = t.nav as Record<string, string>;
  const streamTitle =
    stream === 'deposit'
      ? (n.depositReceipts ?? 'وەسڵی تأمینات')
      : stream === 'rental'
        ? (n.rentalReceipts ?? 'وەسڵی کرێ')
        : stream === 'construction'
          ? (n.constructionReceipts ?? 'وەسڵی بیناسازی')
          : stream === 'office'
            ? (n.officeReceipts ?? 'وەسڵی ئۆفیس')
            : (n.tradingReceipts ?? 'وەسڵی فرۆشتن');
  const streamHint =
    stream === 'deposit'
      ? (n.depositReceiptsHint ??
        'تەنها وەسڵی پارەی تأمینات — ناچێتە ناو حیساباتی گشتی · چاپ لە تابی تأمینات')
      : stream === 'rental'
        ? 'تەنها وەسڵەکانی کرێی مانگانە'
        : stream === 'construction'
          ? 'تەنها وەسڵەکانی دروستکردنی خانوو'
          : 'تەنها وەسڵەکانی کرین و فرۆشتن';

  const filteredItems = items.filter((row) => {
    if (stream === 'trading') {
      if (row.purpose === 'SECURITY_DEPOSIT' || row.purpose === 'RENT' || row.leaseId) return false;
      return row.contractId != null || row.type === 'INCOME';
    }
    if (stream === 'deposit') {
      const d = `${row.description || ''} ${row.partyName || ''}`;
      return row.purpose === 'SECURITY_DEPOSIT' || /تأمینات|تەئمینات|deposit|security/i.test(d);
    }
    if (stream === 'rental') {
      if (row.purpose === 'SECURITY_DEPOSIT') return false;
      const d = `${row.description || ''} ${row.partyName || ''}`;
      if (/تأمینات|تەئمینات/i.test(d) && !/کرێی مانگانە|ماوە:|خشتە:/i.test(d)) return false;
      return (
        row.purpose === 'RENT' ||
        row.leaseId != null ||
        /کرێ|lease|rent/i.test(d) ||
        (row.type === 'INCOME' && !row.contractId)
      );
    }
    if (stream === 'construction') return row.type === 'EXPENSE' || row.type === 'PAYMENT';
    return true;
  });

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50';

  const typeLabel = (type: string) => {
    if (type === 'INCOME') return t.pages.receipts.paymentIn;
    if (type === 'PAYMENT') return t.pages.receipts.paymentOut;
    return (t.status.receipt as Record<string, string>)[type] ?? type;
  };

  const propertyTypeLabel = (type?: string | null) => {
    const map: Record<string, string> = {
      HOUSE: t.pages.contractGen.typeHouse,
      APARTMENT: t.pages.contractGen.typeApartment,
      LAND: t.pages.contractGen.typeLand,
      SHOP: t.pages.contractGen.typeShop,
      BUILDING: t.pages.contractGen.typeBuilding,
    };
    return type ? map[type] ?? type : '';
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (typeFilter) params.set('type', typeFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = await fetch(`/api/receipts${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    setLoading(false);
  }, [debounced, typeFilter, from, to, t.pages.projects.error]);

  const loadContracts = useCallback(async () => {
    const res = await fetch('/api/contracts');
    if (!res.ok) return;
    const data = await res.json();
    setContracts(data.items ?? []);
  }, []);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(tmr);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setForm({
      ...emptyForm(),
      type: stream === 'construction' || stream === 'office' ? 'PAYMENT' : 'INCOME',
      currency: 'IQD',
    });
  }, [stream]);

  useEffect(() => {
    if (modalOpen) void loadContracts();
  }, [modalOpen, loadContracts]);

  useEffect(() => {
    const leaseId = searchParams.get('rentLease');
    if (!leaseId) return;
    const periodHint = searchParams.get('period');

    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/rentals/${leaseId}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const lease = data.lease as {
        id: string;
        leaseNo: string;
        propertyCode: string;
        propertyName: string | null;
        propertyType?: string | null;
        tenantName: string;
        landlordName?: string | null;
        landlordPhone?: string | null;
        currency: 'IQD' | 'USD';
        exchangeRate: number;
        monthlyRentIqd: number;
        nextDueAmountIqd: number | null;
        nextDueDate: string | null;
        nextDueLabel: string | null;
        periodLabel: string | null;
      };
      if (cancelled || !lease) return;

      const currency = lease.currency === 'USD' ? 'USD' : 'IQD';
      const rate = Math.max(1, lease.exchangeRate || 150_000);
      const amountIqd = lease.nextDueAmountIqd ?? lease.monthlyRentIqd;
      const amountNum =
        currency === 'USD'
          ? Math.round((amountIqd / rate) * 100) / 100
          : Math.round(amountIqd);
      const amount = String(amountNum);
      const monthlyDisplay = formatCurrency(
        currency === 'USD' ? lease.monthlyRentIqd / rate : lease.monthlyRentIqd,
        lang,
        currency,
      );
      const period = periodHint || lease.periodLabel || lease.nextDueDate?.slice(0, 7) || '';
      const typeName = propertyTypeLabel(lease.propertyType);
      const amountLabel = formatCurrency(amountNum, lang, currency);
      const descLines = [
        `کرێچی: ${lease.tenantName}`,
        `کۆدی موڵک: ${lease.propertyCode}`,
        typeName ? `جۆری موڵک: ${typeName}` : null,
        lease.propertyName ? `ناوی موڵک: ${lease.propertyName}` : null,
        `کرێی مانگانە: ${monthlyDisplay}`,
        `بڕی ئەم وەسڵە: ${amountLabel}`,
        lease.leaseNo ? `ژمارەی گرێبەست: ${lease.leaseNo}` : null,
        period ? `ماوە: ${period}` : null,
        lease.nextDueDate ? `ڕێکەوتی شایستە: ${lease.nextDueDate}` : null,
        lease.nextDueLabel ? `خشتە: ${lease.nextDueLabel}` : null,
      ].filter(Boolean);

      setRentLeaseId(lease.id);
      setRentPeriod(period || null);
      if (lease.landlordPhone) {
        setLandlordNotify({
          phone: lease.landlordPhone,
          name: lease.landlordName || '',
          propertyCode: lease.propertyCode,
          amountLabel,
          period,
        });
      } else {
        setLandlordNotify(null);
      }
      setEditingId(null);
      setForm({
        type: 'INCOME',
        contractId: '',
        partyName: lease.tenantName || '',
        currency,
        amount,
        totalAmount: amount,
        remainingAmount: '0',
        description: descLines.join(' · '),
      });
      setError('');
      setOk('');
      setModalOpen(true);
      router.replace(`/${lang}/receipts?stream=rental`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per rentLease query
  }, [searchParams, lang, router]);

  useEffect(() => {
    const leaseId = searchParams.get('depositLease');
    if (!leaseId) return;
    const toParam = searchParams.get('depositTo');
    const to =
      toParam === 'roadhome' || toParam === 'landlord' || toParam === 'tenant' ? toParam : null;

    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/rentals/${leaseId}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const lease = data.lease as {
        id: string;
        leaseNo: string;
        propertyCode: string;
        propertyName: string | null;
        propertyType?: string | null;
        tenantName: string;
        landlordName?: string | null;
        currency: 'IQD' | 'USD';
        exchangeRate: number;
        securityDepositIqd: number;
        depositStatus?: string;
      };
      if (cancelled || !lease) return;

      const depositIqd = Math.max(0, lease.securityDepositIqd || 0);
      if (depositIqd <= 0) {
        setError(rr.depositMissing ?? 'بڕی تأمینات لە گرێبەستدا نوسراوە نییە');
        router.replace(`/${lang}/receipts?stream=deposit`, { scroll: false });
        return;
      }

      const currency = lease.currency === 'USD' ? 'USD' : 'IQD';
      const rate = Math.max(1, lease.exchangeRate || 150_000);
      const amountNum =
        currency === 'USD'
          ? Math.round((depositIqd / rate) * 100) / 100
          : Math.round(depositIqd);
      const amount = String(amountNum);
      const typeName = propertyTypeLabel(lease.propertyType);
      const amountLabel = formatCurrency(amountNum, lang, currency);

      const dispositionLine =
        to === 'roadhome'
          ? (rr.depositDispRoadHome ?? 'تأمینات لای ڕۆد هۆم ماوەتەوە')
          : to === 'landlord'
            ? (rr.depositDispLandlord ??
              `پارەی تأمینات درا بە خاوەن خانوو: ${lease.landlordName || '—'}`)
            : to === 'tenant'
              ? (rr.depositDispTenant ??
                `پارەکە گەڕێندرایەوە بۆ کرێچی دوای چۆڵکردنی خانوو: ${lease.tenantName}`)
              : (rr.depositReceiveNote ?? 'وەرگرتنی تأمینات لە کرێچی');

      const partyName =
        to === 'roadhome'
          ? 'ڕۆد هۆم'
          : to === 'landlord'
            ? lease.landlordName || (rr.depositToLandlord ?? 'خاوەن خانوو')
            : lease.tenantName || '';

      const receiptType: 'PAYMENT' | 'INCOME' =
        to === 'landlord' || to === 'tenant' ? 'PAYMENT' : 'INCOME';

      const descLines = [
        'تأمیناتی کرێ',
        dispositionLine,
        `کرێچی: ${lease.tenantName}`,
        lease.landlordName ? `خاوەن خانوو: ${lease.landlordName}` : null,
        `کۆدی موڵک: ${lease.propertyCode}`,
        typeName ? `جۆری موڵک: ${typeName}` : null,
        lease.propertyName ? `ناوی موڵک: ${lease.propertyName}` : null,
        `بڕی تأمینات (لە گرێبەست): ${amountLabel}`,
        lease.leaseNo ? `ژمارەی گرێبەست: ${lease.leaseNo}` : null,
        'تێبینی: ئەم وەسڵە ناچێتە ناو حیساباتی گشتی',
      ].filter(Boolean);

      setDepositLeaseId(lease.id);
      setDepositTo(to);
      setRentLeaseId(null);
      setRentPeriod(null);
      setLandlordNotify(null);
      setEditingId(null);
      setForm({
        type: receiptType,
        contractId: '',
        partyName,
        currency,
        amount,
        totalAmount: amount,
        remainingAmount: '0',
        description: descLines.join(' · '),
      });
      setError('');
      setOk('');
      setModalOpen(true);
      router.replace(`/${lang}/receipts?stream=deposit`, { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per depositLease query
  }, [searchParams, lang, router]);

  const openCreate = () => {
    setEditingId(null);
    setRentLeaseId(null);
    setRentPeriod(null);
    setDepositLeaseId(null);
    setDepositTo(null);
    setForm(emptyForm());
    setError('');
    setOk('');
    setModalOpen(true);
  };

  const openEdit = (row: ReceiptRow) => {
    setEditingId(row.id);
    setRentLeaseId(null);
    setRentPeriod(null);
    setDepositLeaseId(null);
    setDepositTo(null);
    setForm({
      type: row.type === 'EXPENSE' ? 'PAYMENT' : row.type,
      contractId: row.contractId ?? '',
      partyName: row.partyName || row.contract?.buyerName || '',
      currency: row.currency === 'USD' ? 'USD' : 'IQD',
      amount: String(row.amount ?? ''),
      totalAmount: row.totalAmount != null ? String(row.totalAmount) : '',
      remainingAmount: row.remainingAmount != null ? String(row.remainingAmount) : '',
      description: row.description ?? '',
    });
    setError('');
    setOk('');
    setModalOpen(true);
  };

  const deleteReceipt = async (row: ReceiptRow) => {
    const okConfirm = window.confirm(
      rc.confirmDelete ?? 'دەتەوێت ئەم وەسڵە بۆ هەمیشە بسڕیتەوە؟',
    );
    if (!okConfirm) return;
    setBusyId(row.id);
    setError('');
    const res = await fetch(`/api/receipts?id=${encodeURIComponent(row.id)}`, {
      method: 'DELETE',
    });
    setBusyId(null);
    if (!res.ok) {
      setError(t.pages.projects.error);
      return;
    }
    setOk(t.common.deleted);
    await load();
  };

  const applyContract = (contractId: string, type = form.type) => {
    if (!contractId) {
      setForm((prev) => ({ ...prev, contractId: '' }));
      return;
    }
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      setForm((prev) => ({ ...prev, contractId }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      contractId,
      type,
      ...fillFromContract(contract, type),
    }));
  };

  const onTypeChange = (type: FormState['type']) => {
    if (form.contractId) {
      applyContract(form.contractId, type);
      return;
    }
    setForm((prev) => ({ ...prev, type }));
  };

  const closeModal = () => {
    setModalOpen(false);
    setRentLeaseId(null);
    setRentPeriod(null);
    setDepositLeaseId(null);
    setDepositTo(null);
    setLandlordNotify(null);
  };

  const pdfUrl = (id: string, print = false) =>
    `/api/pdf/receipt/${id}?locale=${lang}${print ? '&print=1' : ''}`;

  /** Create receipt only when printing (rent/deposit flow) or on normal save (other receipts). */
  const issueReceipt = async (andPrint: boolean) => {
    setError('');
    setOk('');
    if (!form.partyName.trim() || !form.amount) {
      setError(t.pages.projects.required);
      return;
    }

    // Rent / deposit: no receipt until user prints
    if ((rentLeaseId || depositLeaseId) && !andPrint && !editingId) {
      setError(rc.printRequiredHint ?? 'وەسڵ تەنها دوای چاپکردن تۆمار دەبێت — تکایە چاپ بکە');
      return;
    }

    setSaving(true);
    const purpose = depositLeaseId
      ? 'SECURITY_DEPOSIT'
      : rentLeaseId
        ? 'RENT'
        : 'GENERAL';
    const payload = {
      type: form.type,
      contractId: form.contractId || null,
      leaseId: depositLeaseId || rentLeaseId || null,
      purpose,
      partyName: form.partyName.trim(),
      currency: form.currency,
      amount: Number(form.amount),
      totalAmount: form.totalAmount === '' ? null : Number(form.totalAmount),
      remainingAmount: form.remainingAmount === '' ? null : Number(form.remainingAmount),
      description: form.description.trim() || null,
    };
    const res = await fetch('/api/receipts', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    if (!res.ok) {
      setSaving(false);
      setError(t.pages.projects.error);
      return;
    }

    const data = await res.json().catch(() => ({}));
    const receiptId = (data.item?.id as string | undefined) ?? editingId;

    // Only monthly rent hits accounting via /collect — deposits never do
    if (!editingId && rentLeaseId && !depositLeaseId && form.type === 'INCOME') {
      const amountIqd =
        form.currency === 'USD' ? Number(form.amount) * usdToIqd : Number(form.amount);
      const periodLabel =
        rentPeriod ||
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      await fetch(`/api/rentals/${rentLeaseId}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodLabel,
          amountIqd,
          exchangeRate: usdToIqd,
        }),
      }).catch(() => null);
    }

    // After disposition receipt: update deposit status on the lease
    if (!editingId && depositLeaseId && depositTo) {
      const status =
        depositTo === 'roadhome'
          ? 'FORFEITED'
          : depositTo === 'landlord'
            ? 'PARTIAL_RETURNED'
            : 'RETURNED';
      await fetch(`/api/rentals/${depositLeaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositStatus: status }),
      }).catch(() => null);
    } else if (!editingId && depositLeaseId && !depositTo) {
      // Receiving deposit from tenant → held
      await fetch(`/api/rentals/${depositLeaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositStatus: 'HELD' }),
      }).catch(() => null);
    }

    if (andPrint && receiptId) {
      window.open(pdfUrl(receiptId, true), '_blank', 'noopener,noreferrer');
    }

    const pendingLandlord = depositLeaseId ? null : landlordNotify;
    setSaving(false);
    setRentLeaseId(null);
    setRentPeriod(null);
    setDepositLeaseId(null);
    setDepositTo(null);
    setLandlordNotify(null);
    setOk(andPrint ? (rc.printedSaved ?? t.pages.receipts.saved) : t.pages.receipts.saved);
    setModalOpen(false);
    await load();

    if (andPrint && pendingLandlord?.phone) {
      setLandlordPrompt(pendingLandlord);
    }
  };

  const sendLandlordWhatsApp = () => {
    if (!landlordPrompt) return;
    openWhatsApp(
      landlordPrompt.phone,
      landlordRentReadyMessage({
        landlordName: landlordPrompt.name,
        amountLabel: landlordPrompt.amountLabel,
        propertyCode: landlordPrompt.propertyCode,
        period: landlordPrompt.period,
      }),
    );
    setLandlordPrompt(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // Rent / deposit flow: only print creates the receipt
    if ((rentLeaseId || depositLeaseId) && !editingId) {
      await issueReceipt(true);
      return;
    }
    await issueReceipt(false);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{streamTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{streamHint}</p>
          {stream !== 'deposit' ? (
            <p className="text-sm text-muted-foreground mt-1">
              {t.pages.receipts.paymentIn} · {t.pages.receipts.paymentOut}
            </p>
          ) : null}
        </div>
        {stream === 'deposit' ? (
          <button
            type="button"
            onClick={() => router.push(`/${lang}/rentals?tab=deposit`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {n.depositReceiptsNew ?? 'چاپکردنی وەسڵی تأمینات'}
          </button>
        ) : (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t.pages.receipts.add}
          </button>
        )}
      </div>

      {error && !modalOpen ? <p className="text-sm text-rose-600">{error}</p> : null}
      {ok && !modalOpen ? <p className="text-sm text-primary">{ok}</p> : null}

      <div className="flex flex-col lg:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={rc.searchPlaceholder ?? 'گەڕان بە ژمارە، ناو، گرێبەست…'}
            className={cn(field, 'ps-9')}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as '' | 'INCOME' | 'PAYMENT' | 'EXPENSE')
          }
          className={cn(field, 'w-auto min-w-[160px]')}
          aria-label={t.pages.receipts.type}
        >
          <option value="">{rc.typeAll ?? t.common.all}</option>
          <option value="INCOME">{t.pages.receipts.paymentIn}</option>
          <option value="PAYMENT">{t.pages.receipts.paymentOut}</option>
          <option value="EXPENSE">
            {(t.status.receipt as Record<string, string>).EXPENSE ?? 'خەرجی'}
          </option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={cn(field, 'w-auto')}
          aria-label={rc.fromDate ?? 'لە بەروار'}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={cn(field, 'w-auto')}
          aria-label={rc.toDate ?? 'بۆ بەروار'}
        />
      </div>

      {landlordPrompt ? (
        <div className="rounded-2xl border border-[#25D366]/35 bg-[#25D366]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {rr.whatsappLandlordTitle ?? 'ئاگادارکردنەوەی خاوەن موڵک'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rr.whatsappLandlordHint ??
                'بە یەک کلیک پێی بڵێ کرێ وەرگیرا و دەتوانێت بێت بیبات — بڕ و کۆدی خانوو لە نامەکەدان'}
              {` · ${landlordPrompt.propertyCode} · ${landlordPrompt.amountLabel}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLandlordPrompt(null)}
              className="px-3 py-2 rounded-xl text-xs border border-border hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={sendLandlordWhatsApp}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#25D366] text-white hover:bg-[#1da851]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {rr.whatsappLandlord ?? 'واتساپ بۆ خاوەن موڵک'}
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : filteredItems.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{t.pages.receipts.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.receiptNo}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.type}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.partyName}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.linkContract}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.amount}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.remainingAmount}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.pages.receipts.issuedAt}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.receiptNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-xs font-medium',
                          row.type === 'INCOME'
                            ? 'bg-teal-500/10 text-teal-700'
                            : 'bg-orange-500/10 text-orange-800',
                        )}
                      >
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {row.partyName || row.contract?.buyerName || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.contract?.contractNo ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium">
                      {formatCurrency(row.amount, lang, row.currency === 'USD' ? 'USD' : 'IQD')}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {row.remainingAmount != null
                        ? formatCurrency(row.remainingAmount, lang, row.currency === 'USD' ? 'USD' : 'IQD')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(row.issuedAt, lang)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.common.edit}
                          aria-label={t.common.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <a
                          href={pdfUrl(row.id, true)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.pages.receipts.print}
                          aria-label={t.pages.receipts.print}
                        >
                          <Printer className="h-4 w-4" />
                        </a>
                        <a
                          href={pdfUrl(row.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={t.pages.receipts.downloadPdf}
                          aria-label={t.pages.receipts.downloadPdf}
                        >
                          <FileDown className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void deleteReceipt(row)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50"
                          title={t.common.delete}
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-sidebar/45 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingId
                    ? t.pages.receipts.edit
                    : depositLeaseId
                      ? depositTo === 'roadhome'
                        ? (rr.depositToRoadHome ?? 'ڕۆد هۆم')
                        : depositTo === 'landlord'
                          ? (rr.depositToLandlord ?? 'خاوەن خانوو')
                          : depositTo === 'tenant'
                            ? (rr.depositToTenantShort ?? 'گەڕاندنەوە بۆ کرێچی')
                            : (rr.payDepositReceipt ?? 'وەسڵی تأمینات')
                      : rentLeaseId
                        ? (rr.payRentReceipt ?? t.pages.receipts.add)
                        : t.pages.receipts.add}
                </h2>
                {rentLeaseId || depositLeaseId ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {depositLeaseId
                      ? depositTo
                        ? (rr.depositDispositionHint ??
                          'دوای چاپکردن وەسڵ تۆمار دەبێت و دۆخی تأمینات نوێ دەبێتەوە — ناچێتە حیساباتی گشتی')
                        : (rr.depositReceiptHint ??
                          'بڕ لە گرێبەستەوە دێت — وەسڵ ناچێتە ناو حیساباتی گشتی')
                      : (rc.printRequiredHint ??
                        'وەسڵ تەنها دوای چاپکردن تۆمار دەبێت — زانیاری لە گرێبەستەوە هاتووە')}
                    {rentPeriod ? ` · ${rentPeriod}` : ''}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void save(e)} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.receipts.type}</label>
                <select
                  className={field}
                  value={form.type}
                  onChange={(e) => onTypeChange(e.target.value as FormState['type'])}
                >
                  <option value="INCOME">{t.pages.receipts.paymentIn}</option>
                  <option value="PAYMENT">{t.pages.receipts.paymentOut}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {t.pages.receipts.linkContract}
                </label>
                <select
                  className={field}
                  value={form.contractId}
                  onChange={(e) => applyContract(e.target.value)}
                >
                  <option value="">{t.pages.receipts.noContract}</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractNo} — {c.buyerName || c.title}
                      {c.house?.code ? ` (${c.house.code})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{t.pages.receipts.contractHint}</p>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{t.pages.receipts.partyName}</label>
                <input
                  className={field}
                  value={form.partyName}
                  onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {t.pages.receipts.currency}
                </label>
                <div className="inline-flex rounded-xl border border-border p-1 bg-muted/40">
                  {(['IQD', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={cn(
                        'px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                        form.currency === c
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {c === 'IQD' ? t.pages.rentals.dinar : t.pages.rentals.dollar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    {t.pages.receipts.amount} ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cn(field, 'tabular-nums')}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    readOnly={Boolean(rentLeaseId || depositLeaseId)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    {t.pages.receipts.totalAmount} ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cn(field, 'tabular-nums')}
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    {t.pages.receipts.remainingAmount} ({form.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cn(field, 'tabular-nums')}
                    value={form.remainingAmount}
                    onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  {depositLeaseId
                    ? (rr.depositDetails ?? 'وردەکاری تأمینات لە گرێبەست')
                    : rentLeaseId
                      ? (rc.rentDetails ?? 'وردەکاری لە گرێبەستی کرێ')
                      : t.form.notes}
                </label>
                <textarea
                  className={cn(field, 'min-h-[120px] resize-y whitespace-pre-wrap')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  readOnly={Boolean(rentLeaseId || depositLeaseId)}
                />
              </div>

              {error ? <p className="text-sm text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p> : null}

              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm border border-border text-foreground/80 hover:bg-muted"
                >
                  {t.common.cancel}
                </button>
                {(rentLeaseId || depositLeaseId) && !editingId ? (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Printer className="h-4 w-4" />
                    {rc.printAndIssue ?? 'چاپکردنی وەسڵ'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.common.save}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
