'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import {
    Box, Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, IconButton, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ProductInput } from '../../../_lib/schemas';

export function SizesTab() {
    const { control, register, formState: { errors } } = useFormContext<ProductInput>();
    const { fields, append, remove } = useFieldArray({ control, name: 'sizes' });

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Размеры товара. Порядок отображения управляется полем «Sort».
            </Typography>

            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell width={140}>Количество</TableCell>
                        <TableCell width={100}>Sort</TableCell>
                        <TableCell width={60} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {fields.map((row, idx) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.name`)}
                                    size="small"
                                    fullWidth
                                    error={!!errors.sizes?.[idx]?.name}
                                    helperText={errors.sizes?.[idx]?.name?.message}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.qty`, { valueAsNumber: true })}
                                    type="number"
                                    size="small"
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    {...register(`sizes.${idx}.sort_order`, { valueAsNumber: true })}
                                    type="number"
                                    size="small"
                                    fullWidth
                                />
                            </TableCell>
                            <TableCell>
                                <IconButton size="small" onClick={() => remove(idx)} title="Удалить">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    {fields.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} align="center">
                                <Typography variant="body2" color="text.secondary" py={2}>
                                    Размеры не заданы
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Box mt={2}>
                <Button
                    startIcon={<AddIcon />}
                    onClick={() => append({ name: '', qty: 0, sort_order: fields.length })}
                    variant="outlined"
                >
                    Добавить размер
                </Button>
            </Box>
        </Box>
    );
}
