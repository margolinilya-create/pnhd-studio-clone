"use client";
import React, { useEffect } from "react";
import styles from "./mobile-menu.module.css";
import { useAppSelector, useAppDispatch } from "@/redux/redux-hooks";
import { actions as utilsActions } from "@/redux/utils-slice/utils.slice";
import { usePathname } from "next/navigation";
import Link from "next/link";

const MobileMenu: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isMobileMenuActive } = useAppSelector((store) => store.utils);
    const pathname = usePathname();

    // audit C11 — раньше menu state не reset'ился при programmatic navigation
    // (Link click внутри меню → route смена → меню остаётся открытым). Теперь
    // pathname-effect закрывает меню при каждой смене URL.
    useEffect(() => {
        if (isMobileMenuActive) {
            dispatch(utilsActions.setMobileMenuActive(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const closeMenuHandler = () => {
        dispatch(utilsActions.setMobileMenuActive(false));
    };

    return (
        <>
            {isMobileMenuActive ? (
                <div className={styles.menu}>
                    <div className={styles.menu_closeButtonWrapper}>
                        <button
                            type="button"
                            onClick={closeMenuHandler}
                            className={styles.menu_closeButton}
                        >
                            <div className={styles.button_line}></div>
                            <div className={styles.button_line}></div>
                        </button>
                    </div>
                    <div className={styles.menu_wrapper}>
                        <ul className={styles.menu_list}>
                            <li className={styles.menu_listItem}>
                                <Link
                                    href={{
                                        pathname: "/",
                                        hash: "#methods",
                                    }}
                                    onClick={closeMenuHandler}
                                    className={styles.menu_link}
                                >
                                    методы нанесения
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/shop"
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    каталог
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href={{
                                        pathname: "/",
                                        hash: "#stages",
                                    }}
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    этапы работы
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={{
                                        pathname: "/",
                                        hash: "#feedback",
                                    }}
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    отзывы
                                </Link>
                            </li>
                            {/* <li>
                                <Link
                                    href={{
                                        pathname: "/blog",
                                    }}
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    блог
                                </Link>
                            </li> */}
                            <li>
                                <Link
                                    href={{
                                        pathname: "/",
                                        hash: "#faq",
                                    }}
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    faq
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={{
                                        pathname: "/",
                                        hash: "#contacts",
                                    }}
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    контакты
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/loyalty"
                                    className={styles.menu_link}
                                    onClick={closeMenuHandler}
                                >
                                    бонусы
                                </Link>
                            </li>
                        </ul>
                        <div className={styles.menu_buttonsWrapper}>
                            <Link className={styles.menu_phoneButton} href='https://pnhd.ru'>корпоративный отдел</Link>
                            {/* audit C11 — раньше button без onClick (dead button). Теперь
                                открывает popup-форму лида и закрывает меню. */}
                            <button
                                type="button"
                                className={styles.menu_leadButton}
                                onClick={() => {
                                    dispatch(utilsActions.setPopupType('lead'));
                                    dispatch(utilsActions.setPopupTitle('Получите консультацию'));
                                    dispatch(utilsActions.setPopupVisibility());
                                    closeMenuHandler();
                                }}
                            >
                                проконсультироваться
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default MobileMenu;
