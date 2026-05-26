import { IPrintFileRef } from '@/app/utils/types';

// TODO(supabase-storage): placeholder реализация — следующий коммит подключает
// supabase.storage.from('user-uploads'). Сейчас отдаёт blob URL только для
// визуального превью; после перезагрузки страницы URL перестанет работать.
export async function uploadPrintFile(file: File): Promise<IPrintFileRef> {
  if (typeof window === 'undefined') {
    throw new Error('uploadPrintFile must be called in the browser');
  }
  const url = window.URL.createObjectURL(file);
  return {
    url,
    filename: file.name,
    sizeBytes: file.size,
  };
}
