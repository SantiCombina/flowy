import Image, { type StaticImageData } from 'next/image';

import { cn } from '@/lib/utils';

interface MacbookMockUpProps {
  className?: string;
  src: StaticImageData | string;
  alt: string;
}

export function MacbookMockUp({ className, src, alt }: MacbookMockUpProps) {
  return (
    <div className={cn('relative z-1 mx-auto w-80 max-w-full sm:w-96 lg:w-155', className)}>
      <div className="relative mx-auto w-65.5 overflow-hidden rounded-[14px] border-2 border-[rgb(200,202,203)] px-1.75 pt-1.75 pb-4 sm:w-78.75 lg:w-132.5 lg:rounded-[18px] lg:px-2 lg:pt-2 lg:pb-5 [background:rgb(13,13,13)]">
        <div className="relative w-full overflow-hidden rounded-t-xl border-2 border-[rgb(18,18,18)] lg:rounded-t-[10px] aspect-video">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 512px, (max-width: 1024px) 640px, 1060px"
            quality={100}
            priority
            placeholder="blur"
          />
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-4 bg-linear-to-b from-[#272727] to-[#0d0d0d] lg:h-5" />
      </div>

      <div className="-mt-1.75 relative z-9 mx-auto h-4.5 w-80 rounded-[2px_2px_10px_10px] border-x-[1.5px] border-b-[1.5px] border-[rgb(160,163,167)] shadow-[rgb(108,112,116)_0px_-2px_6px_0px_inset] sm:w-96 lg:h-5.5 lg:w-155 lg:rounded-[2px_2px_12px_12px] [background:radial-gradient(circle,rgb(226,227,228)_85%,rgb(200,202,203)_100%)]">
        <div className="absolute top-0 left-1/2 -ml-12.5 h-2 w-25 rounded-b-xl shadow-[inset_0_0_3px_2px_#babdbf] lg:h-2.5 lg:w-27.5" />
      </div>
      <div className="-bottom-0.5 absolute left-6 h-0.5 w-6 rounded-b-full bg-neutral-600 sm:left-8 sm:w-8 lg:left-12 lg:w-10" />
      <div className="-bottom-0.5 absolute right-6 h-0.5 w-6 rounded-b-full bg-neutral-600 sm:right-8 sm:w-8 lg:right-12 lg:w-10" />
    </div>
  );
}
