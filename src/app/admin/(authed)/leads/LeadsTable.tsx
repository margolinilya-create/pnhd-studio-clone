'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Stack, Snackbar, Alert, Chip, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { updateLeadStatus, type LeadStatus } from './actions';

export interface LeadRow {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    status: LeadStatus;
    created_at: string;
    source: string | null;
}

const STATUS_COLOR: Record<LeadStatus, 'default' | 'primary' | 'success' | 'error'> = {
    new: 'primary',
    contacted: 'default',
    done: 'success',
    spam: 'error',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
    new: 'Новая',
    contacted: 'Связались',
    done: 'Готово',
    spam: 'Спам',
};

const NEXT_ACTIONS: Array<{ from: LeadStatus[]; to: LeadStatus; label: string }> = [
    { from: ['new'],                       to: 'contacted', label: '→ Связались' },
    { from: ['new', 'contacted'],          to: 'done',      label: '→ Готово' },
    { from: ['new', 'contacted'],          to: 'spam',      label: '→ Спам' },
];

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
    const [toast, setToast] = useState<{ severity: 'success' | 'error'; msg: string } | null>(null);

    const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);

    const handleStatus = (id: string, status: LeadStatus) => {
        startTransition(async () => {
            const res = await updateLeadStatus(id, status);
            if (res.ok) {
                setToast({ severity: 'success', msg: 'Статус обновлён' });
                router.refresh();
            } else {
                setToast({ severity: 'error', msg: res.error });
            }
        });
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4">Заявки ({filtered.length})</Typography>
                <ToggleButtonGroup
                    value={filter}
                    exclusive
                    size="small"
                    onChange={(_, v) => v && setFilter(v)}
                >
                    <ToggleButton value="all">Все</ToggleButton>
                    <ToggleButton value="new">Новые</ToggleButton>
                    <ToggleButton value="contacted">В работе</ToggleButton>
                    <ToggleButton value="done">Готовые</ToggleButton>
                    <ToggleButton value="spam">Спам</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width={110}>Статус</TableCell>
                            <TableCell>Имя</TableCell>
                            <TableCell width={160}>Телефон</TableCell>
                            <TableCell width={220}>Email</TableCell>
                            <TableCell width={110}>Источник</TableCell>
                            <TableCell width={130}>Создано</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="body2" color="text.secondary" py={4}>
                                        Заявок не найдено
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {filtered.map((l) => (
                            <TableRow key={l.id} hover>
                                <TableCell>
                                    <Chip
                                        label={STATUS_LABEL[l.status]}
                                        color={STATUS_COLOR[l.status]}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{l.name ?? '—'}</TableCell>
                                <TableCell>
                                    {l.phone ? (
                                        <Box component="a" href={`tel:${l.phone}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            {l.phone}
                                        </Box>
                                    ) : '—'}
                                </TableCell>
                                <TableCell>
                                    {l.email ? (
                                        <Box component="a" href={`mailto:${l.email}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                            {l.email}
                                        </Box>
                                    ) : '—'}
                                </TableCell>
                                <TableCell>{l.source ?? '—'}</TableCell>
                                <TableCell>
                                    {new Date(l.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        {NEXT_ACTIONS.filter((a) => a.from.includes(l.status)).map((a) => (
                                            <Button
                                                key={a.to}
                                                size="small"
                                                variant="outlined"
                                                disabled={pending}
                                                onClick={() => handleStatus(l.id, a.to)}
                                            >
                                                {a.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
