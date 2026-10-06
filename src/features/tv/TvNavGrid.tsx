'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';

export type TvTile = {
  href: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
};

export function TvNavGrid({ tiles }: { tiles: TvTile[] }) {
  return (
    <nav className="rh-tv-grid" aria-label="TV menu">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className="rh-tv-tile"
            data-tv-focus
          >
            <span className="rh-tv-tile-icon">
              <Icon className="rh-tv-icon" />
            </span>
            <span className="rh-tv-tile-label">{tile.label}</span>
            {tile.hint ? <span className="rh-tv-tile-hint">{tile.hint}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
