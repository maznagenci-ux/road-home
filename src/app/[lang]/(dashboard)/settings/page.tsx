import { PageHeader } from '@/components/ui/PageHeader';
import { requireAuth } from '@/lib/page-context';
import { SettingsLanguagePanel } from '@/components/settings/SettingsLanguagePanel';
import { SettingsThemePanel } from '@/components/settings/SettingsThemePanel';

export default async function SettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: paramLang } = await params;
  const { t, session, lang } = await requireAuth(paramLang);

  return (
    <div>
      <PageHeader title={t.pages.settings.title} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettingsLanguagePanel lang={lang} t={t} />
        <SettingsThemePanel t={t} />
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-1">{t.pages.settings.profile}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t.pages.settings.profileDesc}</p>
          <dl className="space-y-3 text-sm max-w-md">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.table.name}</dt>
              <dd className="text-foreground font-medium">{session.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.table.email}</dt>
              <dd className="text-foreground">{session.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.pages.users.role}</dt>
              <dd className="text-foreground">
                {t.roles[session.role as keyof typeof t.roles] ?? session.role}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
