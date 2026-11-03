'use client';

import { useEffect, useState } from 'react';
import { Download, MonitorDown } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries';

type BeforeInstall = Event & { prompt: () => Promise<void> };

export function DesktopDownloadCard({
  t,
  compact = false,
}: {
  t: Dictionary;
  compact?: boolean;
}) {
  const a = t.auth as Dictionary['auth'] & {
    desktopDownloadTitle?: string;
    desktopDownloadHint?: string;
    desktopDownloadButton?: string;
    desktopInstallButton?: string;
  };
  const [installEvent, setInstallEvent] = useState<BeforeInstall | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstall);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const downloadWindows = () => {
    const aEl = document.createElement('a');
    aEl.href = '/api/download/desktop';
    aEl.download = 'ZMKH-Road-Home-Desktop.bat';
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
  };

  const installOrDownload = async () => {
    if (installEvent) {
      await installEvent.prompt();
      setInstallEvent(null);
      return;
    }
    downloadWindows();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void installOrDownload()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        {a.desktopDownloadButton ?? 'داگرتن بۆ ویندۆز'}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MonitorDown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {a.desktopDownloadTitle ?? 'داگرتنی سیستەم بۆ کۆمپیوتەر'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {a.desktopDownloadHint ??
              'لەسەر دێسکتۆپ دایبنێ. سیستەمەکە وەک بەرنامە دەکرێتەوە.'}
          </p>
          <button
            type="button"
            onClick={() => void installOrDownload()}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            <Download className="h-4 w-4" />
            {installEvent
              ? (a.desktopInstallButton ?? 'دامەزراندن لەسەر ئەم کۆمپیوتەرە')
              : (a.desktopDownloadButton ?? 'داگرتن بۆ ویندۆز')}
          </button>
        </div>
      </div>
    </div>
  );
}
