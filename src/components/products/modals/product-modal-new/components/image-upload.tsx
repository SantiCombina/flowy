'use client';

import { ImagePlus, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  pendingFile?: File;
  previewUrl?: string;
  onFileSelect: (file: File | undefined) => void;
}

export function ImageUpload({ pendingFile, previewUrl, onFileSelect }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const localPreviewUrl = useMemo(() => (pendingFile ? URL.createObjectURL(pendingFile) : undefined), [pendingFile]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen');
      return;
    }
    onFileSelect(file);
  };

  const handleRemove = () => {
    onFileSelect(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const displayUrl = localPreviewUrl ?? previewUrl;

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        !displayUrl && 'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!displayUrl) fileInputRef.current?.click();
      }}
    >
      {displayUrl ? (
        <div className="relative flex items-center justify-center p-3">
          {displayUrl.startsWith('blob:') ? (
            <img
              src={displayUrl}
              alt="Imagen del producto"
              width={80}
              height={80}
              className="rounded-md object-cover"
            />
          ) : (
            <Image
              src={displayUrl}
              alt="Imagen del producto"
              width={80}
              height={80}
              className="rounded-md object-cover"
            />
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6">
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Arrastrá, pegá o hacé clic para subir</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
