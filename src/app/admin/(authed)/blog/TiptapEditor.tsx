'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Box, ToggleButton, ToggleButtonGroup, Stack, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { uploadImage } from '../../_lib/upload-image';

interface TiptapEditorProps {
    value: string;
    onChange: (html: string) => void;
    slug: string;
}

export function TiptapEditor({ value, onChange, slug }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            Link.configure({ openOnClick: false, autolink: true }),
            Image,
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt('URL ссылки:');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url }).run();
    };

    const addImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const uniq = crypto.randomUUID();
                const res = await uploadImage({
                    bucket: 'blog-images',
                    path: `${slug}/inline/${uniq}`,
                    file,
                });
                editor.chain().focus().setImage({ src: res.url }).run();
            } catch (e) {
                alert(e instanceof Error ? e.message : 'Ошибка загрузки');
            }
        };
        input.click();
    };

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Stack
                direction="row"
                spacing={1}
                sx={{ p: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
            >
                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="bold"
                        selected={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                    >
                        <FormatBoldIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="italic"
                        selected={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                    >
                        <FormatItalicIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="strike"
                        selected={editor.isActive('strike')}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                    >
                        <StrikethroughSIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="h2"
                        selected={editor.isActive('heading', { level: 2 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                        <LooksTwoIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="h3"
                        selected={editor.isActive('heading', { level: 3 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                        <Looks3Icon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton
                        value="bullet"
                        selected={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                    >
                        <FormatListBulletedIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="ordered"
                        selected={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    >
                        <FormatListNumberedIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton
                        value="quote"
                        selected={editor.isActive('blockquote')}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    >
                        <FormatQuoteIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton value="link" selected={editor.isActive('link')} onClick={addLink}>
                        <LinkIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="image" onClick={addImage}>
                        <ImageIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                <ToggleButtonGroup size="small">
                    <ToggleButton value="undo" onClick={() => editor.chain().focus().undo().run()}>
                        <UndoIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="redo" onClick={() => editor.chain().focus().redo().run()}>
                        <RedoIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Box
                sx={{
                    p: 2,
                    minHeight: 300,
                    '& .ProseMirror': { outline: 'none', minHeight: 280 },
                    '& .ProseMirror img': { maxWidth: '100%', height: 'auto' },
                    '& .ProseMirror p.is-editor-empty:first-child::before': {
                        content: '"Начни писать..."',
                        color: 'text.disabled',
                        float: 'left',
                        height: 0,
                        pointerEvents: 'none',
                    },
                }}
            >
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
}
