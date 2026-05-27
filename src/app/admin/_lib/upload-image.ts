'use server';

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from './require-admin';

const MAX_DIM = 2000;
const WEBP_QUALITY = 85;

export type Bucket = 'product-images' | 'blog-images' | 'gallery-images';

export interface UploadedImage {
    url: string;
    width: number;
    height: number;
    path: string;
}

export async function uploadImage(opts: {
    bucket: Bucket;
    path: string;
    file: File;
}): Promise<UploadedImage> {
    await requireAdmin();

    if (!opts.file || opts.file.size === 0) {
        throw new Error('Файл пустой');
    }

    const buffer = Buffer.from(await opts.file.arrayBuffer());
    const optimized = await sharp(buffer)
        .rotate()
        .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    const meta = await sharp(optimized).metadata();

    const finalPath = opts.path.replace(/\.\w+$/, '') + '.webp';

    const admin = createAdminClient();
    const { error: uploadErr } = await admin.storage
        .from(opts.bucket)
        .upload(finalPath, optimized, {
            contentType: 'image/webp',
            upsert: true,
            cacheControl: '3600',
        });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = admin.storage.from(opts.bucket).getPublicUrl(finalPath);

    return {
        url: publicUrl,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        path: finalPath,
    };
}

export async function deleteImage(bucket: Bucket, path: string): Promise<void> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) throw error;
}
