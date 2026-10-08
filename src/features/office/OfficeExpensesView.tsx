'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Printer, X, Briefcase, Users, Search, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useFxStore } from '@/stores/fx-store';
import type { Dictionary } from '@/i18n/dictionaries';

type Kind = 'office' | 'salary';

type PayrollEmp = {
  id: string;
  name: string;
  jobTitle: string;
  baseSalary: number;
  currency: 'IQD' | 'USD' | string;
  branchId: string | null;
  branch: { id: string; name: string; code: string } | null;
};

type BranchOpt = { id: string; name: string; code: string; isHq?: boolean };

type Row = {
  id: string;
  voucherNo: string;
  accountType: 'OFFICE_EXPENSE' | 'EMPLOYEE_SALARY';
  category: string | null;
  amountIqd: number;
  amountUsd: number;
  partyName: string;
  periodLabel: string | null;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  employeeUserId?: string | null;
};

type EmpYear = {
  key: string;
  employeeUserId: string | null;
  name: string;
  year: number;
  totalIqd: number;
  byCategory: Record<string, number>;
  payments: {
    id: string;
    voucherNo: string;
    category: string | null;
    periodLabel: string | null;
    amountIqd: number;
    note: string | null;
    createdAt: string;
  }[];
};

const OFFICE_CATS = [
  'OFFICE_RENT',
  'OFFICE_UTILITIES',
  'OFFICE_SUPPLIES',
  'OFFICE_TRANSPORT',
  'OFFICE_COMM',
  'OTHER_OFFICE',
] as const;

const SALARY_CATS = ['SALARY', 'BONUS', 'ALLOWANCE'] as const;

const CAT_I18N: Record<string, string> = {
  OFFICE_RENT: 'catOfficeRent',
  OFFICE_UTILITIES: 'catOfficeUtilities',
  OFFICE_SUPPLIES: 'catOfficeSupplies',
  OFFICE_TRANSPORT: 'catOfficeTransport',
  OFFICE_COMM: 'catOfficeComm',
  OTHER_OFFICE: 'catOtherOffice',
  SALARY: 'catSalary',
  BONUS: 'catBonus',
  ALLOWANCE: 'catAllowance',
};

type FormState = {
  category: string;
  partyName: string;
  amount: string;
  deduction: string;
  currency: 'IQD' | 'USD';
  paymentMethod: 'CASH_VAULT' | 'CREDIT';
  periodLabel: string;
  employeeUserId: string;
  note: string;
  dueDate: string;
};

function emptyForm(kind: Kind): FormState {
  return {
    category: kind === 'salary' ? 'SALARY' : 'OFFICE_RENT',
    partyName: '',
    amount: '',
    deduction: '',
    currency: 'IQD',
    paymentMethod: 'CASH_VAULT',
    periodLabel: new Date().toISOString().slice(0, 7),
    employeeUserId: '',
    note: '',
    dueDate: '',
  };
}

export function OfficeExpensesView({ t, lang }: { t: Dictionary; lang: string }) {
  const o = (t.pages as { officeExpenses?: Record<string, string> }).officeExpenses ?? {};
  const fx = useFxStore((s) => s.usdToIqd);
  const [tab, setTab] = useState<Kind>('office');
  const [items, setItems] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ office: 0, salary: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm('office'));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [employees, setEmployees] = useState<PayrollEmp[]>([]);
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [employeeYear, setEmployeeYear] = useState<EmpYear[]>([]);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [empOpen, setEmpOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empError, setEmpError] = useState('');
  const [busyVoucherId, setBusyVoucherId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    jobTitle: '',
    baseSalary: '',
    currency: 'IQD' as 'IQD' | 'USD',
    branchId: '',
  });

  const catLabel = useCallback(
    (code: string | null) => {
      if (!code) return '—';
      const key = CAT_I18N[code];
      return (key && o[key]) || code;
    },
    [o],
  );

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/office-employees');
    if (!res.ok) return;
    const data = await res.json();
    setEmployees(data.items ?? []);
    setBranches(data.branches ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/office-expenses');
    if (!res.ok) {
      setError(o.loadError ?? 'نەتوانرا باربکرێت');
      setItems([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items ?? []);
    setTotals(data.totals ?? { office: 0, salary: 0, all: 0 });
    setEmployeeYear(data.employeeYear ?? []);
    if (typeof data.year === 'number') setSummaryYear(data.year);
    setLoading(false);
  }, [o.loadError]);

  useEffect(() => {
    void load();
    void loadEmployees();
  }, [load, loadEmployees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (tab === 'office' ? r.accountType !== 'OFFICE_EXPENSE' : r.accountType !== 'EMPLOYEE_SALARY') {
        return false;
      }
      if (!q) return true;
      const hay = [
        r.voucherNo,
        r.partyName,
        r.category,
        catLabel(r.category),
        r.periodLabel,
        r.note,
        r.createdBy?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, tab, search, catLabel]);

  const filteredEmployeeYear = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employeeYear;
    return employeeYear.filter((emp) => {
      const hay = [
        emp.name,
        ...Object.keys(emp.byCategory).map((c) => catLabel(c)),
        ...emp.payments.flatMap((p) => [
          p.voucherNo,
          p.periodLabel,
          p.note,
          catLabel(p.category),
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [employeeYear, search, catLabel]);

  function openForm(kind: Kind) {
    setTab(kind);
    setForm(emptyForm(kind));
    setSaveError('');
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.partyName.trim() || !(amount > 0)) {
      setSaveError(o.validation ?? 'ناو و بڕ پێویستن');
      return;
    }
    if (tab === 'office' && !form.note.trim()) {
      setSaveError(o.expenseForRequired ?? 'بنووسە خەرجەکە بۆ چی بوو');
      return;
    }
    if (form.paymentMethod === 'CREDIT' && tab === 'office' && !form.dueDate) {
      setSaveError(o.dueRequired ?? 'بۆ قەرز ڕێکەوتی کۆتایی پێویستە');
      return;
    }
    setSaving(true);
    setSaveError('');
    const currency = form.currency === 'USD' ? 'USD' : 'IQD';
    const exchangeRate = currency === 'USD' ? Math.max(1, fx) : 1;
    const res = await fetch('/api/office-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: tab,
        category: form.category,
        partyName: form.partyName.trim(),
        amount,
        currency,
        exchangeRate,
        paymentMethod: form.paymentMethod,
        periodLabel: tab === 'salary' ? form.periodLabel || null : null,
        deductionIqd: tab === 'salary' ? Number(form.deduction) || 0 : 0,
        employeeUserId: null,
        note: form.note.trim() || null,
        dueDate: form.dueDate || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      setSaveError(err?.error === 'DUE_DATE_REQUIRED' ? (o.dueRequired ?? 'ڕێکەوتی کۆتایی پێویستە') : (o.saveError ?? 'پاشەکەوت سەرکەوتوو نەبوو'));
      return;
    }
    const json = (await res.json()) as { voucher?: { id: string } };
    setOpen(false);
    await load();
    if (json.voucher?.id) {
      window.open(`/api/pdf/voucher/${json.voucher.id}?locale=${lang}&print=1`, '_blank');
    }
  }

  const field =
    'w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary/50';

  const cats = tab === 'salary' ? SALARY_CATS : OFFICE_CATS;

  const formEmpYear = useMemo(() => {
    if (tab !== 'salary') return null;
    const name = form.partyName.trim().toLowerCase();
    if (!name) return null;
    return employeeYear.find((e) => e.name.toLowerCase() === name) ?? null;
  }, [tab, form.partyName, employeeYear]);

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    const salary = Number(empForm.baseSalary);
    if (!empForm.name.trim() || !(salary >= 0)) {
      setEmpError(o.empValidation ?? 'ناو و مووچە پێویستن');
      return;
    }
    setEmpSaving(true);
    setEmpError('');
    const res = await fetch('/api/office-employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: empForm.name.trim(),
        jobTitle: empForm.jobTitle.trim(),
        baseSalary: salary,
        currency: empForm.currency,
        branchId: empForm.branchId || null,
      }),
    });
    setEmpSaving(false);
    if (!res.ok) {
      setEmpError(o.empSaveError ?? 'تۆماری کارمەند سەرکەوتوو نەبوو');
      return;
    }
    setEmpOpen(false);
    setEmpForm({ name: '', jobTitle: '', baseSalary: '', currency: 'IQD', branchId: '' });
    await loadEmployees();
  }

  async function deleteEmployee(id: string, name: string) {
    if (!window.confirm(o.empConfirmDelete ?? `دەتەوێت کارمەند «${name}» ڕەش بکەیتەوە؟`)) return;
    const res = await fetch(`/api/office-employees/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(o.empDeleteError ?? 'نەتوانرا کارمەند ڕەش بکرێتەوە');
      return;
    }
    await loadEmployees();
  }

  async function reverseVoucher(id: string, voucherNo: string) {
    if (!window.confirm(o.voidConfirm ?? `دەتەوێت وەسڵی ${voucherNo} ڕەش بکەیتەوە؟`)) return;
    setBusyVoucherId(id);
    const res = await fetch(`/api/vouchers/${id}/reverse`, { method: 'POST' });
    setBusyVoucherId(null);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(
        err?.error === 'VOUCHER_LOCKED'
          ? (o.voucherLocked ?? 'وەسڵ قفڵ کراوە — پێویستی بە کردنەوەی سوپەر ئەدمین هەیە')
          : (o.voidError ?? 'ڕەشکردنەوە سەرکەوتوو نەبوو'),
      );
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {o.title ?? 'خەرجی ئۆفیس و مووچەی کارمەندان'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {o.subtitle ??
              'تۆماری کارمەند · وەسڵی ئۆفیس و مووچە · زیادکردن و ڕەشکردنەوە'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEmpError('');
              setEmpForm({ name: '', jobTitle: '', baseSalary: '', currency: 'IQD', branchId: '' });
              setEmpOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            {o.addEmployee ?? 'تۆماری کارمەند'}
          </button>
          <button
            type="button"
            onClick={() => openForm('office')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {o.addOffice ?? 'وەسڵی خەرجی ئۆفیس'}
          </button>
          <button
            type="button"
            onClick={() => openForm('salary')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            {o.addSalary ?? 'وەسڵی مووچە'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{o.totalOffice ?? 'کۆی خەرجی ئۆفیس'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(totals.office, lang, 'IQD')}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{o.totalSalary ?? 'کۆی مووچە'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(totals.salary, lang, 'IQD')}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{o.totalAll ?? 'کۆی گشتی'}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(totals.all, lang, 'IQD')}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="inline-flex rounded-xl border border-border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setTab('office')}
            className={`inline-flex items-center gap-2 px-3 py-2 ${
              tab === 'office' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            {o.tabOffice ?? 'خەرجی ئۆفیس'}
          </button>
          <button
            type="button"
            onClick={() => setTab('salary')}
            className={`inline-flex items-center gap-2 px-3 py-2 ${
              tab === 'salary' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            {o.tabSalary ?? 'مووچەی کارمەندان'}
          </button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              o.searchPlaceholder ??
              (tab === 'salary'
                ? 'گەڕان بە ناوی کارمەند، ژمارەی وەسڵ، ماوە…'
                : 'گەڕان بە ناو، ژمارەی وەسڵ، بۆ چی خەرج کرا…')
            }
            className="w-full rounded-xl border border-border bg-card py-2.5 pe-3 ps-9 text-sm outline-none focus:border-primary/40"
            aria-label={o.search ?? 'گەڕان'}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      ) : null}

      {tab === 'salary' ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-foreground">
                {o.employeeRegistry ?? 'تۆماری کارمەندان'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {o.employeeRegistryHint ??
                  'ناو · پیشە · مووچە · لق · دینار یان دۆلار — پاشان وەسڵی مووچە دروست بکە'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmpError('');
                setEmpForm({ name: '', jobTitle: '', baseSalary: '', currency: 'IQD', branchId: '' });
                setEmpOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              {o.addEmployee ?? 'تۆماری کارمەند'}
            </button>
          </div>
          {employees.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {o.noEmployees ?? 'هیچ کارمەندێک تۆمار نەکراوە — «تۆماری کارمەند» دابگرە'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-start px-4 py-3 font-medium">{o.employee ?? 'ناو'}</th>
                    <th className="text-start px-4 py-3 font-medium">{o.jobTitle ?? 'پیشە / کار'}</th>
                    <th className="text-start px-4 py-3 font-medium">{o.branch ?? 'لق'}</th>
                    <th className="text-start px-4 py-3 font-medium">{o.baseSalary ?? 'مووچە'}</th>
                    <th className="text-start px-4 py-3 font-medium">{o.currency ?? 'دراو'}</th>
                    <th className="text-start px-4 py-3 font-medium">{o.actions ?? 'کردار'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3">{emp.jobTitle || '—'}</td>
                      <td className="px-4 py-3">{emp.branch?.name || '—'}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatCurrency(
                          emp.baseSalary,
                          lang,
                          emp.currency === 'USD' ? 'USD' : 'IQD',
                        )}
                      </td>
                      <td className="px-4 py-3">{emp.currency === 'USD' ? 'USD' : 'IQD'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setForm({
                                ...emptyForm('salary'),
                                partyName: emp.name,
                                amount: String(emp.baseSalary || ''),
                                currency: emp.currency === 'USD' ? 'USD' : 'IQD',
                                employeeUserId: emp.id,
                              });
                              setTab('salary');
                              setSaveError('');
                              setOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {o.addSalary ?? 'وەسڵی مووچە'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteEmployee(emp.id, emp.name)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {o.delete ?? 'ڕەشکردنەوە'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'salary' && !loading ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {o.yearSummaryTitle ?? 'کۆی وەرگیراوی کارمەندان لەم ساڵەدا'} ({summaryYear})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {o.yearSummaryHint ??
                'خاوەنکار دەبینێت هەر کارمەندێک چەند پارەی وەرگرتووە و بۆ چی'}
            </p>
          </div>
          {filteredEmployeeYear.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {search.trim()
                ? (o.searchEmpty ?? 'هیچ ئەنجامێک نەدۆزرایەوە')
                : (o.noYearPayments ?? 'هیچ پارەدانێکی ئەم ساڵە تۆمار نەکراوە')}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filteredEmployeeYear.map((emp) => {
                const open = expandedEmp === emp.key;
                const cats = Object.entries(emp.byCategory);
                return (
                  <div key={emp.key}>
                    <button
                      type="button"
                      onClick={() => setExpandedEmp(open ? null : emp.key)}
                      className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-start hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {o.receivedFor ?? 'بۆ چی وەریگرتووە'}:{' '}
                          {cats
                            .map(([c, amt]) => `${catLabel(c)} ${formatCurrency(amt, lang, 'IQD')}`)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-[11px] text-muted-foreground">{o.yearTotal ?? 'کۆی ساڵ'}</p>
                        <p className="text-base font-semibold tabular-nums">
                          {formatCurrency(emp.totalIqd, lang, 'IQD')}
                        </p>
                      </div>
                    </button>
                    {open ? (
                      <div className="bg-muted/20 px-4 pb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          {o.paymentsThisYear ?? 'وەسڵەکانی ئەم ساڵە'}
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-border bg-card">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                              <tr>
                                <th className="text-start px-3 py-2 font-medium">{o.date ?? 'ڕێکەوت'}</th>
                                <th className="text-start px-3 py-2 font-medium">{o.period ?? 'ماوە'}</th>
                                <th className="text-start px-3 py-2 font-medium">{o.category ?? 'جۆر'}</th>
                                <th className="text-start px-3 py-2 font-medium">
                                  {o.receivedFor ?? 'بۆ چی'}
                                </th>
                                <th className="text-start px-3 py-2 font-medium">{o.amount ?? 'بڕ'}</th>
                                <th className="text-start px-3 py-2 font-medium">{o.actions ?? 'کردار'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {emp.payments.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-3 py-2 tabular-nums">
                                    {formatDate(p.createdAt, lang)}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums">{p.periodLabel || '—'}</td>
                                  <td className="px-3 py-2">{catLabel(p.category)}</td>
                                  <td className="px-3 py-2 text-muted-foreground max-w-[12rem] truncate">
                                    {p.note?.replace(/\s*·\s*deduction=[\d.]+/gi, '')
                                      .replace(/\s*·\s*gross=[\d.]+/gi, '')
                                      .replace(/deduction=[\d.]+/gi, '')
                                      .replace(/gross=[\d.]+/gi, '')
                                      .trim() || catLabel(p.category)}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums font-semibold">
                                    {formatCurrency(p.amountIqd, lang, 'IQD')}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`/api/pdf/voucher/${p.id}?locale=${lang}&print=1`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                      >
                                        <Printer className="h-3.5 w-3.5" />
                                        {o.print ?? 'چاپ'}
                                      </a>
                                      <button
                                        type="button"
                                        disabled={busyVoucherId === p.id}
                                        onClick={() => void reverseVoucher(p.id, p.voucherNo)}
                                        className="inline-flex items-center gap-1 text-rose-700 hover:underline disabled:opacity-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {o.delete ?? 'ڕەشکردنەوە'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {search.trim()
              ? (o.searchEmpty ?? 'هیچ ئەنجامێک نەدۆزرایەوە')
              : (o.empty ?? 'هیچ وەسڵێک تۆمار نەکراوە')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{o.number ?? 'ژمارە'}</th>
                  <th className="text-start px-4 py-3 font-medium">{o.date ?? 'ڕێکەوت'}</th>
                  <th className="text-start px-4 py-3 font-medium">
                    {tab === 'salary' ? (o.employee ?? 'کارمەند') : (o.payee ?? 'ناو')}
                  </th>
                  <th className="text-start px-4 py-3 font-medium">{o.category ?? 'جۆر'}</th>
                  {tab === 'office' ? (
                    <th className="text-start px-4 py-3 font-medium">{o.expenseFor ?? 'بۆ چی خەرج کرا'}</th>
                  ) : (
                    <>
                      <th className="text-start px-4 py-3 font-medium">{o.period ?? 'ماوە'}</th>
                      <th className="text-start px-4 py-3 font-medium">
                        {o.receivedFor ?? 'بۆ چی وەریگرتووە'}
                      </th>
                    </>
                  )}
                  <th className="text-start px-4 py-3 font-medium">{o.amount ?? 'بڕ'}</th>
                  <th className="text-start px-4 py-3 font-medium">{o.actions ?? 'کردار'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{row.voucherNo}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(row.createdAt, lang)}</td>
                    <td className="px-4 py-3 font-medium">{row.partyName}</td>
                    <td className="px-4 py-3">{catLabel(row.category)}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[14rem] truncate">
                      {tab === 'office'
                        ? row.note || '—'
                        : row.periodLabel || '—'}
                    </td>
                    {tab === 'salary' ? (
                      <td className="px-4 py-3 text-muted-foreground max-w-[12rem] truncate">
                        {row.note
                          ?.replace(/\s*·\s*deduction=[\d.]+/gi, '')
                          .replace(/\s*·\s*gross=[\d.]+/gi, '')
                          .replace(/deduction=[\d.]+/gi, '')
                          .replace(/gross=[\d.]+/gi, '')
                          .trim() || catLabel(row.category)}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 tabular-nums font-semibold">
                      {formatCurrency(row.amountIqd, lang, 'IQD')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/api/pdf/voucher/${row.id}?locale=${lang}&print=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <Printer className="h-4 w-4" />
                          {o.print ?? 'چاپ'}
                        </a>
                        <button
                          type="button"
                          disabled={busyVoucherId === row.id}
                          onClick={() => void reverseVoucher(row.id, row.voucherNo)}
                          className="inline-flex items-center gap-1.5 text-rose-700 hover:underline disabled:opacity-50"
                        >
                          {busyVoucherId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {o.delete ?? 'ڕەشکردنەوە'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {empOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">{o.addEmployee ?? 'تۆماری کارمەند'}</h2>
              <button
                type="button"
                onClick={() => setEmpOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void saveEmployee(e)} className="p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{o.employee ?? 'ناو'}</label>
                <input
                  className={field}
                  value={empForm.name}
                  onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder={o.employeeNamePlaceholder ?? 'ناوی کارمەند'}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {o.jobTitle ?? 'پیشە / کار'}
                </label>
                <input
                  className={field}
                  value={empForm.jobTitle}
                  onChange={(e) => setEmpForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  placeholder={o.jobTitlePlaceholder ?? 'نموونە: ژمێریار، فرۆشیار، پاسەوان…'}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{o.branch ?? 'لق'}</label>
                <select
                  className={field}
                  value={empForm.branchId}
                  onChange={(e) => setEmpForm((f) => ({ ...f, branchId: e.target.value }))}
                >
                  <option value="">{o.pickBranch ?? '— هەڵبژاردنی لق —'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.baseSalary ?? 'مووچە'}
                  </label>
                  <input
                    className={field}
                    type="number"
                    min="0"
                    step="any"
                    value={empForm.baseSalary}
                    onChange={(e) => setEmpForm((f) => ({ ...f, baseSalary: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.salaryCurrency ?? 'مووچە بە'}
                  </label>
                  <select
                    className={field}
                    value={empForm.currency}
                    onChange={(e) =>
                      setEmpForm((f) => ({ ...f, currency: e.target.value as 'IQD' | 'USD' }))
                    }
                  >
                    <option value="IQD">{o.iqd ?? 'دینار (IQD)'}</option>
                    <option value="USD">{o.usd ?? 'دۆلار (USD)'}</option>
                  </select>
                </div>
              </div>
              {empError ? <p className="text-sm text-rose-600">{empError}</p> : null}
              <button
                type="submit"
                disabled={empSaving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {empSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {o.saveEmployee ?? 'پاشەکەوتکردنی کارمەند'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold">
                {tab === 'salary'
                  ? (o.addSalary ?? 'وەسڵی مووچە')
                  : (o.addOffice ?? 'وەسڵی خەرجی ئۆفیس')}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void submit(e)} className="p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{o.category ?? 'جۆر'}</label>
                <select
                  className={field}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {catLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {tab === 'salary' ? (o.employee ?? 'کارمەند') : (o.payee ?? 'ناو')}
                </label>
                {tab === 'salary' && employees.length > 0 ? (
                  <select
                    className={field}
                    value={form.employeeUserId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const emp = employees.find((x) => x.id === id);
                      setForm((f) => ({
                        ...f,
                        employeeUserId: id,
                        partyName: emp?.name || f.partyName,
                        amount: emp ? String(emp.baseSalary || '') : f.amount,
                        currency: emp?.currency === 'USD' ? 'USD' : emp ? 'IQD' : f.currency,
                      }));
                    }}
                  >
                    <option value="">{o.pickEmployee ?? '— هەڵبژاردنی کارمەند —'}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.jobTitle ? ` — ${e.jobTitle}` : ''}
                        {e.branch?.name ? ` · ${e.branch.name}` : ''}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  className={`${field} ${tab === 'salary' && employees.length > 0 ? 'mt-2' : ''}`}
                  value={form.partyName}
                  onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
                  required
                  placeholder={o.payee ?? 'ناو'}
                />
                {formEmpYear ? (
                  <div className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {o.yearToDate ?? 'کۆی وەرگیراو لەم ساڵەدا'} ({formEmpYear.year})
                    </p>
                    <p className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                      {formatCurrency(formEmpYear.totalIqd, lang, 'IQD')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {o.receivedFor ?? 'بۆ چی'}:{' '}
                      {Object.entries(formEmpYear.byCategory)
                        .map(([c, amt]) => `${catLabel(c)} ${formatCurrency(amt, lang, 'IQD')}`)
                        .join(' · ')}
                    </p>
                  </div>
                ) : null}
              </div>
              {tab === 'office' ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.expenseFor ?? 'بۆ چی خەرج کرا'}
                  </label>
                  <textarea
                    className={field}
                    rows={3}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    required
                    placeholder={
                      o.expenseForPlaceholder ??
                      'نموونە: کرێی مانگی ٩، کارەبای ئۆفیس، کڕینی قەڵەم…'
                    }
                  />
                </div>
              ) : null}
              {tab === 'salary' ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.period ?? 'ماوە (YYYY-MM)'}
                  </label>
                  <input
                    className={field}
                    type="month"
                    value={form.periodLabel}
                    onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))}
                  />
                </div>
              ) : null}
              {tab === 'salary' ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.deduction ?? 'دەرهێنان (باج / قەرز)'}
                  </label>
                  <input
                    className={field}
                    type="number"
                    min="0"
                    step="any"
                    value={form.deduction}
                    onChange={(e) => setForm((f) => ({ ...f, deduction: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{o.amount ?? 'بڕ'}</label>
                  <input
                    className={field}
                    type="number"
                    min="0"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{o.currency ?? 'دراو'}</label>
                  <select
                    className={field}
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value as 'IQD' | 'USD' }))
                    }
                  >
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {o.paymentMethod ?? 'شێوازی پارەدان'}
                  </label>
                  <select
                    className={field}
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        paymentMethod: e.target.value as 'CASH_VAULT' | 'CREDIT',
                      }))
                    }
                  >
                    <option value="CASH_VAULT">{o.cashVault ?? 'کاش / خەزێنە'}</option>
                    <option value="CREDIT">{o.credit ?? 'قەرز'}</option>
                  </select>
                </div>
                {form.paymentMethod === 'CREDIT' && tab === 'office' ? (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {o.dueDate ?? 'ڕێکەوتی کۆتایی'}
                    </label>
                    <input
                      className={field}
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div />
                )}
              </div>
              {tab === 'salary' ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{o.note ?? 'تێبینی'}</label>
                  <textarea
                    className={field}
                    rows={2}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
              ) : null}
              {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {o.saveAndPrint ?? 'پاشەکەوت و چاپکردنی وەسڵ'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
