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
import { ICartOrderElement } from "@/app/utils/types";
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
    const restoredOrder = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!restoredOrder) return;
    try {
      const parsedOrder: Array<ICartOrderElement> = JSON.parse(restoredOrder);
      if (Array.isArray(parsedOrder)) {
        const isValidShape = parsedOrder.every(
          (entry) => entry && typeof entry === 'object' && 'printConfig' in entry,
        );
        if (isValidShape) {
          dispatch(cartActions.restoreCart(parsedOrder));
        } else {
          window.sessionStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch {
      window.sessionStorage.removeItem(CART_STORAGE_KEY);
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
