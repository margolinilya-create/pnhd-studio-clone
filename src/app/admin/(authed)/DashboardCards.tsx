'use client';

import Link from 'next/link';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';

interface CountCard {
    label: string;
    value: number;
    href: string;
}

export function DashboardCards({ cards }: { cards: CountCard[] }) {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>Дашборд</Typography>
            <Grid container spacing={2}>
                {cards.map((c) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.label}>
                        <Card component={Link} href={c.href} sx={{ textDecoration: 'none', display: 'block' }}>
                            <CardContent>
                                <Typography variant="overline" color="text.secondary">{c.label}</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 600 }}>{c.value}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
