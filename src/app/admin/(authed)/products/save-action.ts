'use server';
import type { ProductInput } from '../../_lib/schemas';
export async function saveProduct(_input: ProductInput): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
    return { ok: false, error: 'not implemented yet' };
}
