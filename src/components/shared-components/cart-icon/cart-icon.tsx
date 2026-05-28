"use client";
import React, { useEffect } from "react";
import styles from "./cart-icon.module.css";
import { useAppSelector } from "@/redux/redux-hooks";
import Link from "next/link";
import Image from "next/image";
import cartIcon from "../../../../public/cart_icon.svg";
import { usePathname } from "next/navigation";
import { useAppDispatch } from "@/redux/redux-hooks";
import { actions as cartActions } from "@/redux/cart-slice/cart.slice";
import { CART_STORAGE_KEY } from "@/redux/middleware/cart-persist";
import { isValidStoredCart } from "@/lib/cart/validate-stored-cart";
import { useRouter } from "next/navigation";

const CartIcon: React.FC = () => {
  const dispatch = useAppDispatch();
  const { order, paymentUrl } = useAppSelector((store) => store.cart);
  const router = useRouter();
  const pathname = usePathname();
  const containerStyles =
    order &&
    order.length > 0 &&
    pathname !== "/cart" &&
    pathname !== "/checkout"
      ? styles.cartIcon
      : styles.cartIcon__disabled;

  //  useEffect(() => {
  //       paymentUrl && router.push(paymentUrl);
  // }, [paymentUrl])

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Drop legacy v1/v2 keys (pre-printConfig + pre-path schema).
    window.sessionStorage.removeItem('order');
    window.sessionStorage.removeItem('order_v2');

    const stored = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      dispatch(cartActions.markHydrated());
      return;
    }
    try {
      const parsed: unknown = JSON.parse(stored);
      if (isValidStoredCart(parsed)) {
        dispatch(cartActions.restoreCart(parsed));
      } else {
        window.sessionStorage.removeItem(CART_STORAGE_KEY);
        dispatch(cartActions.markHydrated());
      }
    } catch {
      window.sessionStorage.removeItem(CART_STORAGE_KEY);
      dispatch(cartActions.markHydrated());
    }
  }, [dispatch]);

  return (
    <div className={containerStyles}>
      <Link href="/cart" className={styles.cartIcon_link}>
        <button type="button" className={styles.cartIcon_button}>
          <Image src={cartIcon} alt="иконка корзины" />
          {order && order.length > 0 && (
            <div className={styles.cartIcon_counterBox}>
              <p className={styles.cartIcon_counter}>{order.length}</p>
            </div>
          )}
        </button>
      </Link>
    </div>
  );
};

export default CartIcon;
