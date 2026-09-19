'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/theme-provider';
import { BrandMark } from './BrandMark';

type BrandLogoProps = {
  size?: number;
  className?: string;
  /** Force light-on-dark mark (sidebar). */
  onDark?: boolean;
  /** House monogram only — crisp SVG. */
  iconOnly?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  size = 40,
  className,
  onDark = false,
  iconOnly = false,
  priority = false,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefer explicit onDark; otherwise wait until mount so SSR/client match.
  const isDark = onDark || (mounted && resolvedTheme === 'dark');

  if (iconOnly) {
    return <BrandMark size={size} onDark={onDark} className={className} />;
  }

  const src = isDark ? '/brand/logo-on-dark.png' : '/brand/logo-mark.png';

  return (
    <Image
      src={src}
      alt="Road Home ZMKH Real Estate"
      width={size}
      height={size}
      className={cn('object-contain', className)}
      priority={priority}
    />
  );
}
