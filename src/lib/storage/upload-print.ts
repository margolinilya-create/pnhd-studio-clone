import { IPrintFileRef } from '@/app/utils/types';
import { getSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'user-uploads';

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

export async function uploadPrintFile(file: File): Promise<IPrintFileRef> {
  if (typeof window === 'undefined') {
    throw new Error('uploadPrintFile must be called in the browser');
  }
  const supabase = getSupabaseClient();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${id}-${sanitizeFilename(file.name)}`;

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
  };
}
