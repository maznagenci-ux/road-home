'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, Loader2, MessageCircle, Pencil, Plus, Trash2, Video, X } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { openStaffGroupForHouseReserve, STAFF_WHATSAPP_GROUP_URL } from '@/lib/whatsapp';
import type { Dictionary } from '@/i18n/dictionaries';

const MAX_IMAGES = 10;
const MAX_VIDEO_SEC = 60;

type HouseRow = {
  id: string;
  code: string;
  name: string;
  unitNumber: string | null;
  area: number | null;
  price: number | null;
  finalPrice: number | null;
  facadeM: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  guestRooms: number | null;
  budgetIqd: number;
  location: string | null;
  address: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  description: string | null;
  status: string;
  targetFinishAt: string | null;
  property: { id: string; name: string } | null;
  place: {
    neighborhood: string;
    province: string;
    city: string;
    plotNo: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
};

type PropertyOpt = { id: string; name: string };

const emptyForm = () => ({
  code: '',
  name: '',
  unitNumber: '',
  area: '',
  price: '',
  finalPrice: '',
  facadeM: '',
  bedrooms: '',
  bathrooms: '',
  guestRooms: '',
  budgetIqd: '',
  description: '',
  address: '',
  imageUrls: [] as string[],
  videoUrl: '',
  lat: '',
  lng: '',
  propertyId: '',
  status: 'IN_CONSTRUCTION',
  targetFinishAt: '',
  neighborhood: '',
  province: 'هەولێر',
  city: 'هەولێر',
  plotNo: '',
});

function parseImages(row: HouseRow): string[] {
  if (Array.isArray(row.imageUrls) && row.imageUrls.length) return row.imageUrls.slice(0, MAX_IMAGES);
  if (row.imageUrl) return [row.imageUrl];
  return [];
}

export function HousesCrudView({ t, lang }: { t: Dictionary; lang: string }) {
  const h = t.pages.houses as Record<string, string>;
  const [items, setItems] = useState<HouseRow[]>([]);
  const [properties, setProperties] = useState<PropertyOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [reserveHint, setReserveHint] = useState('');

  const field =
    'rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50';

  const statusLabel = (status: string) => t.status.house?.[status as keyof typeof t.status.house] ?? status;

  const load = useCallback(async () => {
    setLoading(true);
    const [res, propsRes] = await Promise.all([fetch('/api/houses'), fetch('/api/properties')]);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    } else setError(t.pages.projects.error);
    if (propsRes.ok) {
      const data = await propsRes.json();
      setProperties((data.items ?? []).map((p: PropertyOpt) => ({ id: p.id, name: p.name })));
    }
    setLoading(false);
  }, [t.pages.projects.error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setFormOpen(true);
  }

  function openEdit(row: HouseRow) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      unitNumber: row.unitNumber ?? '',
      area: row.area != null ? String(row.area) : '',
      price: row.price != null ? String(row.price) : '',
      finalPrice: row.finalPrice != null ? String(row.finalPrice) : '',
      facadeM: row.facadeM != null ? String(row.facadeM) : '',
      bedrooms: row.bedrooms != null ? String(row.bedrooms) : '',
      bathrooms: row.bathrooms != null ? String(row.bathrooms) : '',
      guestRooms: row.guestRooms != null ? String(row.guestRooms) : '',
      budgetIqd: row.budgetIqd ? String(row.budgetIqd) : '',
      description: row.description ?? '',
      address: row.address ?? '',
      imageUrls: parseImages(row),
      videoUrl: row.videoUrl ?? '',
      lat: row.place?.lat != null ? String(row.place.lat) : '',
      lng: row.place?.lng != null ? String(row.place.lng) : '',
      propertyId: row.property?.id ?? '',
      status: row.status || 'IN_CONSTRUCTION',
      targetFinishAt: row.targetFinishAt ? row.targetFinishAt.slice(0, 10) : '',
      neighborhood: row.place?.neighborhood ?? '',
      province: row.place?.province || 'هەولێر',
      city: row.place?.city || 'هەولێر',
      plotNo: row.place?.plotNo ?? '',
    });
    setError('');
    setFormOpen(true);
  }

  const reserveHouse = async (row: HouseRow) => {
    const address =
      row.address?.trim() ||
      [row.place?.neighborhood, row.place?.city, row.place?.province, row.location]
        .filter(Boolean)
        .join(' — ');
    const { copied, opened } = await openStaffGroupForHouseReserve({
      code: row.code,
      name: row.name || row.code,
      price: row.price,
      finalPrice: row.finalPrice,
      area: row.area,
      facadeM: row.facadeM,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      guestRooms: row.guestRooms,
      address,
      neighborhood: row.place?.neighborhood,
      city: row.place?.city,
      province: row.place?.province,
      plotNo: row.place?.plotNo,
      imageUrls: parseImages(row),
      imageUrl: row.imageUrl,
      videoUrl: row.videoUrl,
      lat: row.place?.lat,
      lng: row.place?.lng,
    });
    setReserveHint(
      opened
        ? 'واتساپ کرایەوە — گرووپی کارمەندان هەڵبژێرە و ناردن دابگرە' +
          (copied ? ' (دەقیش کۆپی کرا)' : '')
        : copied
          ? 'دەقی حەرز کۆپی کرا — لە واتساپ پەیست بکە'
          : 'نەتوانرا واتساپ بکرێتەوە',
    );
    window.setTimeout(() => setReserveHint(''), 6000);
  };

  const uploadFile = async (file: File, kind: 'image' | 'video') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'houses');
    const res = await fetch('/api/uploads', { method: 'POST', body: fd });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; maxMb?: number };
      if (data.error === 'FILE_SIZE') {
        setError(
          kind === 'video'
            ? (h.videoTooLarge ?? `ڤیدۆ گەورەیە — تا ${data.maxMb ?? 40}MB`)
            : (h.imageTooLarge ?? 'وێنە گەورەیە'),
        );
      } else if (data.error === 'FILE_TYPE') {
        setError(kind === 'video' ? (h.videoType ?? 'تەنها mp4/webm') : (h.imageType ?? 'جۆری وێنە هەڵەیە'));
      } else setError(t.pages.projects.error);
      return null;
    }
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  };

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const room = MAX_IMAGES - form.imageUrls.length;
      const list = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const f of list) {
        const url = await uploadFile(f, 'image');
        if (url) urls.push(url);
      }
      if (urls.length) {
        setForm((prev) => ({
          ...prev,
          imageUrls: [...prev.imageUrls, ...urls].slice(0, MAX_IMAGES),
        }));
      }
    } finally {
      setUploading(false);
    }
  };

  const addVideo = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const duration = await new Promise<number>((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          resolve(Number.isFinite(v.duration) ? v.duration : 0);
          URL.revokeObjectURL(v.src);
        };
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(file);
      });
      if (duration > MAX_VIDEO_SEC + 1) {
        setError(h.videoTooLong ?? 'ڤیدۆ نابێت لە ١ خولەک زیاتر بێت');
        return;
      }
      const url = await uploadFile(file, 'video');
      if (url) setForm((f) => ({ ...f, videoUrl: url }));
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const latN = form.lat.trim() ? Number(form.lat) : null;
    const lngN = form.lng.trim() ? Number(form.lng) : null;
    const body = {
      name: form.name.trim(),
      unitNumber: form.unitNumber || null,
      area: form.area ? Number(form.area) : null,
      price: form.price ? Number(form.price) : null,
      finalPrice: form.finalPrice ? Number(form.finalPrice) : null,
      facadeM: form.facadeM ? Number(form.facadeM) : null,
      bedrooms: form.bedrooms !== '' ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms !== '' ? Number(form.bathrooms) : null,
      guestRooms: form.guestRooms !== '' ? Number(form.guestRooms) : null,
      budgetIqd: form.budgetIqd ? Number(form.budgetIqd) : 0,
      description: form.description || null,
      address: form.address.trim() || null,
      imageUrls: form.imageUrls,
      imageUrl: form.imageUrls[0] ?? null,
      videoUrl: form.videoUrl.trim() || null,
      propertyId: form.propertyId || null,
      status: form.status,
      targetFinishAt: form.targetFinishAt
        ? new Date(`${form.targetFinishAt}T12:00:00`).toISOString()
        : null,
      neighborhood: form.neighborhood.trim(),
      province: form.province.trim() || 'هەولێر',
      city: form.city.trim() || 'هەولێر',
      plotNo: form.plotNo || null,
      lat: latN != null && Number.isFinite(latN) ? latN : null,
      lng: lngN != null && Number.isFinite(lngN) ? lngN : null,
    };

    const res = editingId
      ? await fetch(`/api/houses/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await fetch('/api/houses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, code: form.code.trim() }),
        });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === 'CODE_EXISTS') setError(h.codeExists);
      else if (data.error === 'HAS_DEPENDENCIES') setError(h.hasDeps);
      else if (data.error === 'VALIDATION') setError(h.validation);
      else setError(t.pages.projects.error);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirm.delete)) return;
    const res = await fetch(`/api/houses/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error === 'HAS_DEPENDENCIES' ? h.hasDeps : t.pages.projects.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{h.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{h.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={STAFF_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            گرووپی واتساپ (حەرز)
          </a>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {h.add}
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {reserveHint ? (
        <p className="text-sm text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          {reserveHint}
        </p>
      ) : null}
      {formOpen && (
        <form onSubmit={(e) => void save(e)} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">{editingId ? h.editTitle : h.add}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              className={field}
              placeholder={h.codeLabel ?? 'کۆدی تایبەت'}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
              disabled={!!editingId}
            />
            <input
              className={field}
              placeholder={t.table.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.unitNumber}
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
            />
            <input
              className={field}
              placeholder={h.neighborhood}
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.plotNo}
              value={form.plotNo}
              onChange={(e) => setForm({ ...form, plotNo: e.target.value })}
            />
            <input
              className={field}
              placeholder={h.city}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder={h.province}
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              required
            />
            <input
              className={cn(field, 'sm:col-span-2 lg:col-span-3')}
              placeholder={h.address ?? 'ناونیشان'}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={h.area ?? 'ڕووبەر (م²)'}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
            <input
              type="number"
              step="any"
              className={cn(field, 'tabular-nums')}
              placeholder={h.facadeM ?? 'واجیهە (م)'}
              value={form.facadeM}
              onChange={(e) => setForm({ ...form, facadeM: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className={cn(field, 'tabular-nums')}
              placeholder={h.bedrooms ?? 'ژووری نوستن'}
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className={cn(field, 'tabular-nums')}
              placeholder={h.bathrooms ?? 'حەمام'}
              value={form.bathrooms}
              onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className={cn(field, 'tabular-nums')}
              placeholder={h.guestRooms ?? 'ژووری میوان'}
              value={form.guestRooms}
              onChange={(e) => setForm({ ...form, guestRooms: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={h.salePrice ?? 'نرخ'}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={h.finalPrice ?? 'نرخی کۆتایی'}
              value={form.finalPrice}
              onChange={(e) => setForm({ ...form, finalPrice: e.target.value })}
            />
            <input
              type="number"
              className={cn(field, 'tabular-nums')}
              placeholder={t.dashboard.budget}
              value={form.budgetIqd}
              onChange={(e) => setForm({ ...form, budgetIqd: e.target.value })}
            />
            <input
              type="number"
              step="any"
              className={cn(field, 'tabular-nums')}
              placeholder={h.lat ?? 'lat'}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
            <input
              type="number"
              step="any"
              className={cn(field, 'tabular-nums')}
              placeholder={h.lng ?? 'lng'}
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
            <select
              className={field}
              value={form.propertyId}
              onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
            >
              <option value="">{h.property}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="IN_CONSTRUCTION">{statusLabel('IN_CONSTRUCTION')}</option>
              <option value="SOLD">{statusLabel('SOLD')}</option>
              <option value="FINISHED">{statusLabel('FINISHED')}</option>
            </select>
            <input
              type="date"
              className={field}
              title={h.finishDate ?? 'کاتی تەواوبوون'}
              value={form.targetFinishAt}
              onChange={(e) => setForm({ ...form, targetFinishAt: e.target.value })}
            />
            <input
              className={cn(field, 'sm:col-span-2 lg:col-span-3')}
              placeholder={h.description}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {h.imagesLabel ?? 'وێنە'} ({form.imageUrls.length}/{MAX_IMAGES})
              </p>
              <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted disabled:opacity-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {h.uploadImage ?? 'بارکردنی وێنە'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  disabled={uploading || form.imageUrls.length >= MAX_IMAGES}
                  onChange={(e) => {
                    void addImages(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {form.imageUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {form.imageUrls.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-20 w-28 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, imageUrls: f.imageUrls.filter((u) => u !== url) }))
                      }
                      className="absolute -top-1.5 -end-1.5 rounded-full bg-rose-600 text-white p-0.5"
                      aria-label="remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{h.imagesHint ?? 'تا ١٠ وێنە'}</p>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {h.videoLabel ?? 'ڤیدۆ (تا ١ خولەک)'}
              </p>
              <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                {h.uploadVideo ?? 'بارکردنی ڤیدۆ'}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    void addVideo(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {form.videoUrl ? (
              <div className="flex items-center gap-2">
                <a href={form.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">
                  {form.videoUrl}
                </a>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, videoUrl: '' }))}
                  className="p-1 rounded-lg text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{h.videoHint ?? 'mp4/webm — تا ١ خولەک'}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl text-sm border border-border"
            >
              {t.common.cancel}
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium">
              {t.common.save}
            </button>
          </div>
        </form>
      )}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground">{t.common.loading}</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">{h.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start font-medium">{h.codeLabel ?? t.pages.projects.code}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.name}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.neighborhood}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.salePrice ?? 'نرخ'}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.finalPrice ?? 'کۆتایی'}</th>
                  <th className="px-4 py-3 text-start font-medium">{h.area}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.status}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const imgs = parseImages(row);
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {imgs[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgs[0]} alt="" className="h-9 w-12 rounded-lg object-cover border border-border" />
                          ) : null}
                          <Link href={`/${lang}/projects/${row.code}`} className="font-mono text-primary hover:underline">
                            {row.code}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.place?.neighborhood || row.location || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.price != null ? formatCurrency(row.price, lang) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.finalPrice != null ? formatCurrency(row.finalPrice, lang) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.area != null ? row.area : '—'}</td>
                      <td className="px-4 py-3">{statusLabel(row.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void reserveHouse(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                            title="حەرز لە گرووپی WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            حەرز
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="p-2 rounded-lg text-foreground hover:bg-muted"
                            title={h.edit}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row.id)}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
