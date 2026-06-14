import Image, { type StaticImageData } from 'next/image';

import { cn } from '@/lib/utils';

interface IphoneMockUpProps {
  className?: string;
  src: StaticImageData | string;
  alt: string;
}

export function IphoneMockUp({ className, src, alt }: IphoneMockUpProps) {
  return (
    <div className={cn('relative z-10', className)}>
      <div className="relative z-30 rounded-[42px] border border-[#1B1721] bg-black p-3 shadow-[inset_0_0_3px_2px_rgb(192,183,205),inset_0_0_0_4px_rgb(52,44,63)] lg:rounded-[52px] lg:p-3.75 lg:shadow-[inset_0_0_4px_2px_rgb(192,183,205),inset_0_0_0_6px_rgb(52,44,63)]">
        <div className="absolute top-12 left-0 z-20 h-1.25 w-3.5 bg-black/25 lg:top-16 lg:h-1.5 lg:w-4.5" />
        <div className="absolute top-12 right-0 z-20 h-1.25 w-3.5 bg-black/25 lg:top-16 lg:h-1.5 lg:w-4.5" />
        <div className="absolute bottom-12 left-0 z-20 h-1.25 w-3.5 bg-black/25 lg:bottom-16 lg:h-1.5 lg:w-4.5" />
        <div className="absolute right-0 bottom-12 z-20 h-1.25 w-3.5 bg-black/25 lg:right-0 lg:bottom-16 lg:h-1.5 lg:w-4.5" />
        <div className="absolute top-0 right-12 z-20 h-3.5 w-1.25 bg-black/25 lg:top-0 lg:right-16 lg:h-4.5 lg:w-1.5" />
        <div className="absolute bottom-0 left-12 z-20 h-3.5 w-1.25 bg-black/25 lg:bottom-0 lg:left-16 lg:h-4.5 lg:w-1.5" />
        <div className="relative z-20 w-56 overflow-hidden rounded-[30px] lg:w-72.5 lg:rounded-[38px] aspect-828/1794">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 448px, 580px"
            quality={100}
            priority
            placeholder="blur"
          />
        </div>
      </div>

      <div className="absolute top-16 -left-0.5 h-5.5 w-0.5 rounded-[2px] bg-[#1B1721] lg:top-22 lg:h-6.5 lg:w-0.75" />
      <div className="absolute top-30 -right-0.5 h-15 w-0.5 rounded-[2px] bg-[#1B1721] lg:top-38.75 lg:h-20 lg:w-0.75" />
      <div className="absolute top-25 -left-0.5 h-11 w-0.5 rounded-[2px] bg-[#1B1721] lg:top-35 lg:h-14 lg:w-0.75" />
      <div className="absolute top-38.75 -left-0.5 h-11 w-0.5 rounded-[2px] bg-[#1B1721] lg:top-52.5 lg:h-14 lg:w-0.75" />
    </div>
  );
}
