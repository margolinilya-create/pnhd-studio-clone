'use client'
import React, { useEffect, useRef, useState } from 'react'
import styles from './cookie-bar.module.css'
import cookiePic from '../../../../public/cookie.jpg'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// excludedRoutes — техническая конфигурация (на каких страницах банер не показывать),
// а не контент. Намеренно живёт в коде, не в Payload.
const routeConfig = ['/privacy', '/oferta'];

interface CookieBarClientProps {
    title: string;
    description: unknown; // Lexical root or null
    buttonLabel: string;
}

// Tiny inline Lexical-to-JSX serializer. Покрывает paragraphs + inline links —
// этого хватает для cookie-баннера. Format bitmask (bold/italic) намеренно
// игнорим: для одного предложения с одной ссылкой не нужно.
function renderLexical(node: unknown): React.ReactNode {
    if (!node || typeof node !== 'object') return null;
    const n = node as {
        type?: string;
        children?: unknown[];
        text?: string;
        format?: number;
        url?: string;
        fields?: { url?: string; newTab?: boolean };
    };

    if (typeof n.text === 'string') {
        return n.text;
    }

    if (n.type === 'link' && (n.fields?.url || n.url)) {
        const url = n.fields?.url ?? n.url ?? '#';
        return (
            <Link href={url}>
                {Array.isArray(n.children)
                    ? n.children.map((c, i) => (
                        <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
                    ))
                    : null}
            </Link>
        );
    }

    if (Array.isArray(n.children)) {
        const inner = n.children.map((c, i) => (
            <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
        ));
        if (n.type === 'paragraph') return <p>{inner}</p>;
        return inner;
    }

    return null;
}

function descriptionToReact(description: unknown): React.ReactNode[] | null {
    if (!description || typeof description !== 'object') return null;
    const root = (description as { root?: { children?: unknown[] } }).root;
    if (!root || !Array.isArray(root.children) || root.children.length === 0) return null;
    return root.children.map((c, i) => (
        <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
    ));
}

const CookieBarClient = ({ title, description, buttonLabel }: CookieBarClientProps) => {

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

    if (!isBarVisisble) return null;

    const descContent = descriptionToReact(description);
    const hasLexicalContent = Array.isArray(descContent) && descContent.length > 0;

    return (
        // audit A4 — role=region + aria-label делает banner discoverable для
        // screen reader rotor'а как landmark.
        <div className={styles.backdrop} role="region" aria-label="Уведомление об использовании cookie">
            <div className={styles.bar}>
                <div className={styles.bar__imgWrapper}>
                    <Image src={cookiePic} alt='' aria-hidden="true" />
                </div>
                <div className={styles.bar__wrapper}>
                    <p className={styles.bar__title}>{title}</p>
                    {hasLexicalContent ? (
                        // Lexical отдаёт собственные <p>, поэтому оборачиваем
                        // в <div> с классом .bar__text — стили для p внутри
                        // покрыты CSS-селектором .bar__text p (см. module.css)
                        <div className={styles.bar__text}>{descContent}</div>
                    ) : (
                        <p className={styles.bar__text}>
                            Мы понятия не имеем что с ними делать, но сообщать об этом теперь обязаны, окак! Юридическим языком написано <Link href='/privacy'>тут</Link>
                        </p>
                    )}
                    <button
                        ref={buttonRef}
                        type="button"
                        className={styles.bar__button}
                        onClick={buttonClickHandler}
                    >
                        {buttonLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CookieBarClient;
