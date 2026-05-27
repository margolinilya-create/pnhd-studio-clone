'use client';

import { Button } from '@mui/material';
import { signOut } from '../(authed)/logout/actions';

export function SignOutButton() {
    return (
        <form action={signOut}>
            <Button type="submit" size="small" color="inherit">
                Выйти
            </Button>
        </form>
    );
}
