'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './cookie-bar.module.css'
import cookiePic from '../../../../public/cookie.jpg'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const routeConfig = ['/privacy', '/oferta'];

const CookieBar = () => {

    const [isBarVisisble, setIsBarVisible] = useState(false)
    const pathname = usePathname()
    const buttonRef = useRef<HTMLButtonElement>(null)
    const buttonClickHandler = () => {
        localStorage.setItem('COOKIE_AGREEMENT', 'AGREED')
        setIsBarVisible(false)
    }


    useEffect(() => {
        const cookieAgreement = localStorage.getItem('COOKIE_AGREEMENT');
        if (!cookieAgreement && !routeConfig.some(_ => _ === pathname)) {
            setIsBarVisible(true)
        } else {
            setIsBarVisible(false)
        }
    }, [pathname])

    // audit A4 — keyboard accessibility для cookie banner.
    // Escape принимает cookies (как закрытие диалога). Banner не focus-trap'ит
    // (он не модальный — главный контент остаётся interactive), но Escape
    // даёт keyboard-users быстрый дисмисс.
    useEffect(() => {
        if (!isBarVisisble) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                buttonClickHandler();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isBarVisisble])

    return isBarVisisble && (
        // audit A4 — role=region + aria-label делает banner discoverable для
        // screen reader rotor'а как landmark.
        <div className={styles.backdrop} role="region" aria-label="Уведомление об использовании cookie">
            <div className={styles.bar}>
                <div className={styles.bar__imgWrapper}>
                    <Image src={cookiePic} alt='' aria-hidden="true" />
                </div>
                <div className={styles.bar__wrapper}>
                    <p className={styles.bar__title}>МЫ СОБИРАЕМ КУКИ!</p>
                    <p className={styles.bar__text}>Мы понятия не имеем что с ними делать, но сообщать об этом теперь обязаны, окак! Юридическим языком написано <Link href='/privacy'>тут</Link></p>
                    <button
                        ref={buttonRef}
                        type="button"
                        className={styles.bar__button}
                        onClick={buttonClickHandler}
                    >
                        ПОНЯЛ, СОГЛАСЕН!
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CookieBar;