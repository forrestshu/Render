'use client';

import { useEffect } from 'react';
import { captureEvent } from '@/lib/posthog';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // 追踪模态框打开事件
      captureEvent('image_modal_opened');
    } else {
      document.body.style.overflow = 'unset';
      // 追踪模态框关闭事件
      captureEvent('image_modal_closed');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-[95vw] max-h-[95vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="关闭"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

