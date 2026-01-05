'use client';

import Image from 'next/image';

interface ImagePreviewProps {
  src: string;
  alt: string;
  title: string;
  onRemove?: () => void;
}

export default function ImagePreview({ src, alt, title, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Delete button - positioned absolutely in top right corner */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
          title="删除图片"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {/* Image - fills entire container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}
