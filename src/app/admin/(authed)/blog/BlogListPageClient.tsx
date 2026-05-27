'use client';

import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { BlogTable } from './BlogTable';
import type { BlogRow } from './page';

export function BlogListPageClient({ posts }: { posts: BlogRow[] }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Блог-посты ({posts.length})</Typography>
                <Button component={Link} href="/admin/blog/new" variant="contained">
                    + Новый
                </Button>
            </Stack>
            <BlogTable posts={posts} />
        </Box>
    );
}
