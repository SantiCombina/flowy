import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface FlowyLogoProps {
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  textSize?: 'sm' | 'md' | 'lg';
  href?: string;
  showText?: boolean;
  onClick?: () => void;
  textClass?: string;
}

const iconPx = { sm: 32, md: 36, lg: 40 };

export function FlowyLogo({
  className,
  iconSize = 'md',
  textSize = 'lg',
  href = '/',
  showText = true,
  onClick,
  textClass,
}: FlowyLogoProps) {
  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const px = iconPx[iconSize];

  const content = (
    <>
      <Image src="/isotipo.png" alt="Flowy" width={px} height={px} className="shrink-0" priority />
      {showText && (
        <span
          className={cn('font-bold tracking-tight', textClass ?? 'text-foreground', textSizeClasses[textSize])}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Flowy
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('flex items-center gap-2', className)} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return <div className={cn('flex items-center gap-2', className)}>{content}</div>;
}
