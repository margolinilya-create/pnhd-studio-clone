'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type LoginState } from './actions';
import { TextField, Button, Alert, Box, Container, Paper, Typography } from '@mui/material';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" variant="contained" fullWidth disabled={pending} size="large">
            {pending ? 'Вход…' : 'Войти'}
        </Button>
    );
}

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
    const [state, formAction] = useFormState(signIn, {
        error: initialError,
    });

    return (
        <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
            <Paper sx={{ p: 4, width: '100%' }} elevation={1}>
                <Typography variant="h5" gutterBottom>PNHD admin</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Вход в панель управления
                </Typography>
                <Box component="form" action={formAction} display="flex" flexDirection="column" gap={2}>
                    <input type="hidden" name="next" value={next} />
                    <TextField name="email" label="Email" type="email" autoComplete="email" required autoFocus />
                    <TextField name="password" label="Пароль" type="password" autoComplete="current-password" required />
                    {state.error && <Alert severity="error">{state.error}</Alert>}
                    <SubmitButton />
                </Box>
            </Paper>
        </Container>
    );
}
