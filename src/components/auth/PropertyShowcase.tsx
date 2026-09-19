'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/I18nProvider';
import type { Dictionary } from '@/i18n/dictionaries';

type SlideId = keyof Dictionary['auth']['propertySlides'];

type PropertySlide = {
  id: SlideId;
  image: string;
};

export const PROPERTY_SLIDES: PropertySlide[] = [
  {
    id: 'house',
    image:
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'building',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'land',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'construction',
    image:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'apartment',
    image:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
  },
];

const INTERVAL_MS = 5500;

export function PropertyShowcase({
  className,
  developerCreditPrefix,
  developerName,
}: {
  className?: string;
  developerCreditPrefix?: string;
  developerName?: string;
}) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PROPERTY_SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, mounted]);

  const active = PROPERTY_SLIDES[index];
  const slides = t.auth.propertySlides;
  const label = slides?.[active.id] ?? active.id;
  const caption = t.auth.propertyCaption ?? '';

  return (
    <div
      className={cn('relative isolate overflow-hidden bg-sidebar text-white', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {PROPERTY_SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-[1200ms] ease-in-out',
            i === index ? 'opacity-100 z-[1]' : 'opacity-0 z-0',
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={slide.image}
            alt={slides?.[slide.id] ?? slide.id}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className={cn('object-cover', mounted && i === index && 'rh-ken-burns')}
          />
        </div>
      ))}

      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

      <div className="relative z-[3] flex h-full min-h-[inherit] flex-col justify-end p-8 md:p-10 lg:p-12">
        <div className="space-y-4">
          <div key={`${active.id}-${label}`} className="rh-city-caption">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/55" suppressHydrationWarning>
              {caption}
            </p>
            <p
              className="mt-1 text-3xl md:text-4xl font-semibold text-white tracking-tight"
              suppressHydrationWarning
            >
              {label}
            </p>
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label={caption}>
            {PROPERTY_SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={slides?.[slide.id] ?? slide.id}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === index ? 'w-8 bg-primary' : 'w-1.5 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          {developerCreditPrefix ? (
            <p className="pt-2 text-[11px] text-white/50 border-t border-white/10">
              {developerCreditPrefix}{' '}
              <a
                href="https://www.facebook.com/profile.php?id=61590509712166&mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white/80 hover:text-white underline-offset-2 hover:underline"
              >
                {developerName ?? 'Mazn Agency'}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const KurdistanCitiesShowcase = PropertyShowcase;
