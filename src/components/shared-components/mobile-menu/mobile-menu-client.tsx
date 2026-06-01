"use client";
import React, { useEffect } from "react";
import styles from "./mobile-menu.module.css";
import { useAppSelector, useAppDispatch } from "@/redux/redux-hooks";
import { actions as utilsActions } from "@/redux/utils-slice/utils.slice";
import { usePathname } from "next/navigation";
import Link from "next/link";

export interface MobileMenuItem {
    label: string;
    href: string;
    hash?: string | null;
    isExternal?: boolean | null;
}

export interface MobileMenuClientProps {
    navItems: MobileMenuItem[];
    wholesaleUrl: string;
    wholesaleLabel: string;
    mobileCTALabel: string;
    defaultPopupTitle: string;
}

const MobileMenuClient: React.FC<MobileMenuClientProps> = ({
    navItems,
    wholesaleUrl,
    wholesaleLabel,
    mobileCTALabel,
    defaultPopupTitle,
}) => {
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

    if (!isMobileMenuActive) return null;

    return (
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
                    {navItems.map((item, i) => {
                        const isCatalog = item.hash === 'catalog' || item.href === '/shop';
                        const linkHref = isCatalog
                            ? '/shop'
                            : item.hash
                                ? { pathname: item.href || '/', hash: `#${item.hash}` }
                                : item.href || '/';

                        if (item.isExternal) {
                            return (
                                <li key={`${item.label}-${i}`} className={styles.menu_listItem}>
                                    <a
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.menu_link}
                                        onClick={closeMenuHandler}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            );
                        }

                        return (
                            <li key={`${item.label}-${i}`} className={styles.menu_listItem}>
                                <Link
                                    href={linkHref}
                                    onClick={closeMenuHandler}
                                    className={styles.menu_link}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                <div className={styles.menu_buttonsWrapper}>
                    <Link className={styles.menu_phoneButton} href={wholesaleUrl}>{wholesaleLabel}</Link>
                    {/* audit C11 — раньше button без onClick (dead button). Теперь
                        открывает popup-форму лида и закрывает меню. */}
                    <button
                        type="button"
                        className={styles.menu_leadButton}
                        onClick={() => {
                            dispatch(utilsActions.setPopupType('lead'));
                            dispatch(utilsActions.setPopupTitle(defaultPopupTitle));
                            dispatch(utilsActions.setPopupVisibility());
                            closeMenuHandler();
                        }}
                    >
                        {mobileCTALabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileMenuClient;
