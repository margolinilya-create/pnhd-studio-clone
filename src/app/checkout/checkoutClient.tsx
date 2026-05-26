"use client";
import React, { ChangeEvent, FormEvent, useEffect, useState, FormEventHandler } from "react";
import styles from "./page.module.css";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useAppSelector, useAppDispatch } from "@/redux/redux-hooks";
import { actions as cartActions } from "@/redux/cart-slice/cart.slice";
import MainUserData from "@/components/pages-components/checkout-page/main-user-data/main-user-data";
import DeliveryData from "@/components/pages-components/checkout-page/delivery-data/delivery-data";
import { cartSummaryFunc } from "../utils/cart-utils";
import { checkoutOrderObjectCreateFunc } from "../utils/cart-utils";
import { useCreateOrderMutation, usePromocodeValidationMutation } from "@/api/api";
import { useRouter } from "next/navigation";
import { getCookie } from "../utils/constants";
import TextField from "@mui/material/TextField";
import rightArrow from '../../../public/button_arrow_right.svg';
import Image from "next/image";
import Link from "next/link";


const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': {
        color: 'rgb(153,255,0)',
        '&:hover': {
            backgroundColor: 'rgba(153,255,0,.1)',
        },
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
        backgroundColor: 'rgba(153,255,0,.9)',
    },
};
const switchLabelSx = {
    "& .MuiTypography-root": { fontFamily: "Neue_machina" },
};

const textFieldSx = {
    "& .MuiInputLabel-root": { fontFamily: "Neue_machina" },
    "& .MuiInputLabel-root.Mui-focused": { color: "rgb(57,57,57)" },
    "& .MuiOutlinedInput-root.Mui-focused": {
        "& > fieldset": { borderColor: "rgb(57,57,57)" },
    },
};


const CheckoutPage: React.FC = () => {
    const [ isDisabled, setIsDisabled ] = useState<boolean>(false)
    const [ submitButtonDisabled, setSubmitButtonDisabled ] = useState<boolean>(false)
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { isDelivery, order, deliveryParams, paymentUrl, user_promocode, validPromoCode } = useAppSelector(store => store.cart);
    const cart = useAppSelector(store => store.cart);
    const totalOrderPrice = cartSummaryFunc(order!);
    const [ createOrder, { isLoading, isSuccess} ] = useCreateOrderMutation();
    const [ validatePromocode, { isLoading: isPromocodeLoading, isSuccess: isPromocodeValidationSuccess, reset } ] = usePromocodeValidationMutation();


    useEffect(() => {

        return () => {
            dispatch(cartActions.setDelivery(false));
            dispatch(cartActions.resetValidCity());
            dispatch(cartActions.resetValidDeliveryPoint());
            dispatch(cartActions.setCdekCitySearchUserQuery(''));
        }
    }, [])

    useEffect(() => {
        !order || order.length === 0 && router.replace('/shop');
    }, [order])

    const checkDeliveryValidayion = (): boolean => {
        let result = true;
        if (!isDelivery) {result = true}
        if (isDelivery) {
            if (!deliveryParams.validCityTo || !deliveryParams.validDeliveryPoint) {result = false}
        }
        return result;
    }



    const formSubmitHandler = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // TODO(supabase-migration): подключить Edge Function `create-order` + платёжный шлюз (YooKassa/Robokassa).
        alert('Чекаут в демо-режиме клона. Заказ не оформляется, платёжный шлюз и CDEK ещё не подключены.');
    }

    const switchHandler = (e: ChangeEvent<HTMLInputElement>) => {
        dispatch(cartActions.setDelivery(e.target.checked))
        if (!e.target.checked) {
            dispatch(cartActions.resetValidCity())
            dispatch(cartActions.resetValidDeliveryPoint())
            dispatch(cartActions.setCdekCitySearchUserQuery(''));
        }
    }

    const promocodeChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
        dispatch(cartActions.setUserPromocode(e.target.value));
        if (!e.target.value) {
            dispatch(cartActions.resetValidPromocode());
            reset();
        }
    }

    const promocodeFormSubmitHandler = async (e: any) => {
        e.preventDefault();
        // TODO(supabase-migration): таблица `promocodes` + Edge Function `validate-promocode`.
        alert('Промокоды в демо-режиме клона недоступны.');
    }

    return (
        <section className={styles.checkout}>
            <h1>Оформление покупки</h1>
            <form className={styles.checkout_form} id='checkout' onSubmit={formSubmitHandler}>
                <MainUserData />
                <FormGroup>
                    <FormControlLabel
                        sx={switchLabelSx}
                        control={
                            <Switch
                                sx={switchSx}
                                id='delivery'
                                checked={isDelivery}
                                onChange={switchHandler}
                            />
                        }
                        label="Доставка"
                    />
                </FormGroup>
                {isDelivery && <DeliveryData />}
            </form>
            <div className={styles.checkout_priceWrapper}>
                <form className={styles.promocode_form} onSubmit={promocodeFormSubmitHandler}>
                    <TextField
                        id="promocode"
                        label="Промокод"
                        fullWidth
                        autoComplete="off"
                        sx={textFieldSx}
                        size="small"
                        onChange={promocodeChangeHandler}
                        value={user_promocode}
                    />

                    <button type='submit' className={styles.promocode_button} disabled={isPromocodeLoading || isPromocodeValidationSuccess}>
                        <Image src={rightArrow} alt='стрелка вправо' />
                    </button>
                </form>
                <p className={styles.checkout_priceText}>Итого по заказу: {totalOrderPrice} Р.</p>
                <p className={styles.checkout_priceText}>Доставка: {deliveryParams.deliveryPrice} Р.</p>
                {deliveryParams.validCityTo && deliveryParams.validCityTo.city && <p className={styles.checkout_priceText}>Доставка в: {deliveryParams.validCityTo.city}</p>}
                {deliveryParams.validDeliveryPoint && deliveryParams.validDeliveryPoint.name && <p className={styles.checkout_priceText}>Пункт выдачи: {deliveryParams.validDeliveryPoint.name}</p>}
                <p className={styles.checkout_finalPriceText} style={validPromoCode.name ? { textDecoration: 'line-through rgb(153,255,0)'} : {}}>= {totalOrderPrice + deliveryParams.deliveryPrice} Р.</p>
                {validPromoCode.name && validPromoCode.discount_ratio && <p className={styles.checkout_finalPriceText} style={{ fontSize: '18px' }}>= {(totalOrderPrice * validPromoCode.discount_ratio) + deliveryParams.deliveryPrice} Р.</p>}
                <button type='submit' form='checkout' className={styles.form_submitButton} disabled={isDisabled || !checkDeliveryValidayion()}>{isDisabled ? 'Загрузка...':'Заказать'}</button>
                <p className={styles.privacy}>Оформляя заказ вы соглашаетесь с <Link target="_blank" style={{color: 'black'}} href='/privacy'>политикой конфиденциальности</Link></p>
            </div>
        </section>
    );
};

export default CheckoutPage;
