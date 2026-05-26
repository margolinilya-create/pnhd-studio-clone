'use client';

import Link from 'next/link';
import {
    Box, AppBar, Toolbar, Typography, Drawer,
    List, ListItem, ListItemButton, ListItemText,
} from '@mui/material';
import { SignOutButton } from './SignOutButton';

const DRAWER_WIDTH = 220;

const NAV = [
    { href: '/admin',           label: 'Дашборд' },
    { href: '/admin/products',  label: 'Товары' },
    { href: '/admin/blog',      label: 'Блог' },
    { href: '/admin/gallery',   label: 'Принты' },
    { href: '/admin/leads',     label: 'Заявки' },
];

export function AdminShell({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }} elevation={0} color="default">
                <Toolbar sx={{ gap: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 0, fontWeight: 700 }}>PNHD admin</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body2" color="text.secondary">{userEmail}</Typography>
                    <SignOutButton />
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
                }}
            >
                <Toolbar />
                <List>
                    {NAV.map((n) => (
                        <ListItem key={n.href} disablePadding>
                            <ListItemButton component={Link} href={n.href}>
                                <ListItemText primary={n.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                {children}
            </Box>
        </Box>
    );
}
