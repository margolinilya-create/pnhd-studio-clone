'use client';
import React from 'react';
import styles from './cart-item-total-price.module.css';
import { ICartOrderElement } from '@/app/utils/types';
import { useAppDispatch } from '@/redux/redux-hooks';
import { actions as cartActions } from '@/redux/cart-slice/cart.slice';

const CartItemTotalPrice: React.FC<{ elem: ICartOrderElement }> = ({ elem }) => {
  const dispatch = useAppDispatch();
  const productQty = elem.item.sizes.reduce(
    (acc, size) => acc + (size.userQty ?? 0),
    0,
  );
  const textileTotalPrice = elem.item.price * productQty;

  const deleteItemButtonClickHandler = () => {
    dispatch(cartActions.deleteItemFromCart({ itemCartId: elem.itemCartId }));
  };

  return (
    <div className={styles.itemTotalPrice}>
      <button
        type="button"
        className={styles.itemTotalPrice_deleteItemButton}
        onClick={deleteItemButtonClickHandler}
      >
        Удалить
      </button>
      <p className={styles.itemTotalPrice_text}>
        Итого текстиль: {textileTotalPrice}&nbsp;Р.
      </p>
      <p className={styles.itemTotalPrice_text}>Итого: {textileTotalPrice}&nbsp;Р.</p>
    </div>
  );
};

export default CartItemTotalPrice;
