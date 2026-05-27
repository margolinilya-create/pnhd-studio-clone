import { IPrintFileRef } from '@/app/utils/types';
import { getSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'user-uploads';
const PATH_PREFIX = 'prints'; // соответствует storage.objects RLS policy

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

function isAllowedMime(file: File): boolean {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
}

export async function uploadPrintFile(file: File): Promise<IPrintFileRef> {
  if (typeof window === 'undefined') {
    throw new Error('uploadPrintFile must be called in the browser');
  }
  if (!isAllowedMime(file)) {
    throw new Error('Поддерживаются только PNG, JPG и WEBP');
  }
  const supabase = getSupabaseClient();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${PATH_PREFIX}/${id}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    filename: file.name,
    sizeBytes: file.size,
    path,
  };
}
