"use client";
import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Alert from "@mui/material/Alert";
import { MuiTelInput } from "mui-tel-input";

import styles from "./page.module.css";
import { useAppDispatch, useAppSelector } from "@/redux/redux-hooks";
import { actions as cartActions } from "@/redux/cart-slice/cart.slice";
import { cartSummaryFunc } from "@/app/utils/cart-utils";
import { useCreateLeadMutation, ILeadAttachment } from "@/api/api";
import { getRoistatVisit } from "@/lib/analytics/roistat";

const textFieldSx = {
    "& .MuiInputLabel-root": { fontFamily: "Neue_machina" },
    "& .MuiInputLabel-root.Mui-focused": { color: "rgb(57,57,57)" },
    "& .MuiOutlinedInput-root.Mui-focused": {
        "& > fieldset": { borderColor: "rgb(57,57,57)" },
    },
};

const CheckoutPage: React.FC = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { order, isHydrated } = useAppSelector((store) => store.cart);
    const totalOrderPrice = cartSummaryFunc(order ?? []);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [email, setEmail] = useState("");
    const [comment, setComment] = useState("");
    const [consent, setConsent] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [createLead, { isLoading }] = useCreateLeadMutation();

    // Редиректим в /shop, если корзина пуста (после гидрации).
    useEffect(() => {
        if (!isHydrated) return;
        if ((order ?? []).length === 0) {
            router.replace("/shop");
        }
    }, [isHydrated, order, router]);

    const attachments: ILeadAttachment[] = useMemo(() => {
        const out: ILeadAttachment[] = [];
        for (const elem of order ?? []) {
            for (const [side, file] of Object.entries(elem.printConfig?.files ?? {})) {
                if (file?.url) {
                    out.push({
                        side: `${elem.item.name} / ${side}`,
                        url: file.url,
                        filename: file.filename,
                    });
                }
            }
        }
        return out;
    }, [order]);

    const orderSummaryText = useMemo(() => {
        const lines: string[] = [];
        for (const elem of order ?? []) {
            const qty = elem.item.sizes.reduce((acc, s) => acc + (s.userQty ?? 0), 0);
            const sizesText = elem.item.sizes
                .filter((s) => (s.userQty ?? 0) > 0)
                .map((s) => `${s.name}×${s.userQty}`)
                .join(", ");
            const printText =
                elem.printConfig?.location && elem.printConfig.location !== "none"
                    ? ` [принт: ${elem.printConfig.location}]`
                    : "";
            lines.push(
                `• ${elem.item.name} — ${qty} шт. (${sizesText})${printText} — ${elem.item.price * qty} ₽`,
            );
        }
        lines.push(`Итого: ${totalOrderPrice} ₽`);
        return lines.join("\n");
    }, [order, totalOrderPrice]);

    const isValid =
        name.trim().length > 0 &&
        phone.replace(/\D/g, "").length >= 7 &&
        city.trim().length > 0 &&
        consent;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isValid || isLoading) return;
        setSubmitError(null);

        const fullComment = [
            comment.trim() ? `Комментарий: ${comment.trim()}` : "",
            `Город доставки: ${city.trim()}`,
            "",
            "Состав заказа:",
            orderSummaryText,
        ]
            .filter(Boolean)
            .join("\n");

        try {
            const result = await createLead({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                comment: fullComment,
                source: "checkout",
                roistat_visit: getRoistatVisit() || undefined,
                attachments: attachments.length > 0 ? attachments : undefined,
            }).unwrap();

            if (result?.leadId) {
                dispatch(cartActions.resetCart());
                router.push("/thanks");
            }
        } catch (err) {
            const errAny = err as { error?: string; data?: { error?: string } };
            setSubmitError(
                errAny?.data?.error ??
                    errAny?.error ??
                    "Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь по телефону.",
            );
        }
    };

    if (!isHydrated || (order ?? []).length === 0) {
        return null;
    }

    return (
        <div className={styles.checkoutWrapper}>
            <h1 className={styles.checkoutTitle}>Оформление заявки</h1>

            <section className={styles.orderSummary}>
                <h2 className={styles.summaryTitle}>Ваш заказ</h2>
                <ul className={styles.summaryList}>
                    {(order ?? []).map((elem) => {
                        const qty = elem.item.sizes.reduce((acc, s) => acc + (s.userQty ?? 0), 0);
                        const sizesText = elem.item.sizes
                            .filter((s) => (s.userQty ?? 0) > 0)
                            .map((s) => `${s.name}×${s.userQty}`)
                            .join(", ");
                        return (
                            <li key={elem.itemCartId} className={styles.summaryItem}>
                                <Link href={`/shop/${elem.item.slug}`} className={styles.summaryItemLink}>
                                    {elem.item.name}
                                </Link>
                                <span className={styles.summaryItemMeta}>
                                    {qty} шт. ({sizesText}) — {elem.item.price * qty} ₽
                                </span>
                                {elem.printConfig?.location && elem.printConfig.location !== "none" && (
                                    <span className={styles.summaryItemPrint}>
                                        Принт: {elem.printConfig.location}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
                <p className={styles.summaryTotal}>Итого: {totalOrderPrice} ₽</p>
                <p className={styles.summaryHint}>
                    Стоимость печати рассчитается менеджером по вашему макету. Финальная цена будет согласована
                    перед оплатой.
                </p>
            </section>

            <form className={styles.leadForm} onSubmit={handleSubmit} noValidate>
                <TextField
                    required
                    fullWidth
                    label="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={textFieldSx}
                    inputProps={{ maxLength: 100 }}
                />
                <MuiTelInput
                    required
                    fullWidth
                    label="Телефон"
                    defaultCountry="RU"
                    value={phone}
                    onChange={setPhone}
                    sx={textFieldSx}
                />
                <TextField
                    required
                    fullWidth
                    label="Город доставки"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    sx={textFieldSx}
                    inputProps={{ maxLength: 100 }}
                />
                <TextField
                    fullWidth
                    type="email"
                    label="Email (необязательно)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={textFieldSx}
                    inputProps={{ maxLength: 200 }}
                />
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Комментарий (необязательно)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    sx={textFieldSx}
                    inputProps={{ maxLength: 2000 }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            required
                            sx={{ color: 'rgb(57,57,57)', '&.Mui-checked': { color: 'rgb(57,57,57)' } }}
                        />
                    }
                    label={
                        <span style={{ fontFamily: 'Neue_machina', fontSize: 13 }}>
                            Согласен с обработкой персональных данных в соответствии с{" "}
                            <Link href="/privacy" style={{ textDecoration: 'underline' }}>политикой конфиденциальности</Link>
                        </span>
                    }
                />

                {submitError && <Alert severity="error">{submitError}</Alert>}

                <Button
                    type="submit"
                    variant="contained"
                    disabled={!isValid || isLoading}
                    className={styles.submitBtn}
                >
                    {isLoading ? "Отправляем…" : "Оформить заявку"}
                </Button>

                <p className={styles.submitHint}>
                    Менеджер свяжется в течение 30 минут для согласования макета, итоговой цены и условий доставки.
                </p>
            </form>
        </div>
    );
};

export default CheckoutPage;
