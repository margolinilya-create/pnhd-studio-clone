"use client";
import React from "react";
import styles from "./page.module.css";
import { useAppSelector } from "@/redux/redux-hooks";
import ProductImage from "@/components/pages-components/cart-page/product-image/product-image";
import ProductDescription from "@/components/pages-components/cart-page/product-description/product-description";
import PrintPreview from "@/components/pages-components/cart-page/print-preview/print-preview";
import CartItemTotalPrice from "@/components/pages-components/cart-page/cart-item-total-price/cart-item-total-price";
import CartSummary from "@/components/pages-components/cart-page/cart-summary/cart-summary";
import EmptyState from "@/components/pages-components/cart-page/empty-state/empty-state";
import Link from "next/link";

interface CartClientProps {
    disclaimer?: string | null;
    emptyState: {
        title: string;
        subtitle?: string | null;
        ctaLabel: string;
        ctaHref: string;
    };
}

const Cart: React.FC<CartClientProps> = ({ disclaimer, emptyState }) => {
    const { order, isHydrated } = useAppSelector((store) => store.cart);

    if (!isHydrated) {
        return (
            <section className={styles.cart}>
                <h1>Корзина</h1>
            </section>
        );
    }

    if ((order ?? []).length === 0) {
        return (
            <EmptyState
                title={emptyState.title}
                subtitle={emptyState.subtitle}
                ctaLabel={emptyState.ctaLabel}
                ctaHref={emptyState.ctaHref}
            />
        );
    }

    return (
        <section className={styles.cart}>
            <h1>Корзина</h1>
            {(order ?? []).map((elem) => (
                <div className={styles.cart_products} key={elem.itemCartId}>
                    <ProductImage elem={elem} />
                    <ProductDescription elem={elem} />
                    <PrintPreview elem={elem} />
                    <CartItemTotalPrice elem={elem} />
                </div>
            ))}
            <CartSummary />
            {disclaimer && <p className={styles.cart_disclaimer}>{disclaimer}</p>}
            <Link href={'/checkout'} className={styles.cart_checkoutLink}>
                <button type="button" className={styles.cart_checkoutButton}>оформить заказ</button>
            </Link>
        </section>
    );
};

export default Cart;
