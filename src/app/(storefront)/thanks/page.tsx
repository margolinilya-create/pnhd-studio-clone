import { Metadata } from "next";
import Link from "next/link";
import React from "react";

import { buildMetadata } from "@/app/_lib/build-metadata";
import { getCheckoutMessages } from "@/lib/queries/checkout-messages";
import { getSiteSettings } from "@/lib/queries/site-settings";

import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSiteSettings();
    const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
    return await buildMetadata({
        title: `Заявка отправлена | ${siteName}`,
        description: 'Спасибо! Менеджер свяжется в течение 30 минут.',
        path: '/thanks',
    });
}

// Tiny inline Lexical-to-JSX serializer. Same pattern as cookie-bar:
// покрывает paragraphs + inline links + bold/italic — этого хватает для thanks-страницы.
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
        let out: React.ReactNode = n.text;
        // Lexical format bitmask: 1=bold, 2=italic, 4=strikethrough, 8=underline
        const format = n.format ?? 0;
        if (format & 1) out = <strong>{out}</strong>;
        if (format & 2) out = <em>{out}</em>;
        if (format & 8) out = <u>{out}</u>;
        return out;
    }

    if (n.type === 'link' && (n.fields?.url || n.url)) {
        const url = n.fields?.url ?? n.url ?? '#';
        const newTab = n.fields?.newTab;
        const isExternal = /^https?:\/\//.test(url);
        const inner = Array.isArray(n.children)
            ? n.children.map((c, i) => (
                <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
            ))
            : null;
        if (isExternal || newTab) {
            return (
                <a href={url} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}>
                    {inner}
                </a>
            );
        }
        return <Link href={url}>{inner}</Link>;
    }

    if (Array.isArray(n.children)) {
        const inner = n.children.map((c, i) => (
            <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
        ));
        if (n.type === 'paragraph') return <p className={styles.text}>{inner}</p>;
        if (n.type === 'heading') return <p className={styles.text}>{inner}</p>;
        return <>{inner}</>;
    }

    return null;
}

function bodyToReact(body: unknown): React.ReactNode[] | null {
    if (!body || typeof body !== 'object') return null;
    const root = (body as { root?: { children?: unknown[] } }).root;
    if (!root || !Array.isArray(root.children) || root.children.length === 0) return null;
    return root.children.map((c, i) => (
        <React.Fragment key={i}>{renderLexical(c)}</React.Fragment>
    ));
}

const Page: React.FC = async () => {
    const messages = await getCheckoutMessages();

    const heading = messages?.thanksHeading ?? 'СПАСИБО!';
    const ctaList = messages?.thanksCTAs ?? [];
    const bodyContent = bodyToReact(messages?.thanksBody);

    return (
        <section className={styles.page}>
            <div className={styles.wrapper}>
                <h1 className={styles.title}>{heading}</h1>
                {bodyContent && bodyContent.length > 0 ? (
                    bodyContent
                ) : (
                    <>
                        <p className={styles.text}>
                            Заявка отправлена. Менеджер свяжется с вами <strong>в течение 30 минут</strong> по
                            указанному телефону — согласует расположение принта, итоговую стоимость и условия доставки.
                        </p>
                        <p className={styles.text}>
                            Если вы не получите звонок — напишите нам в Telegram <a href="https://t.me/pnhd_studio" target="_blank" rel="noopener noreferrer">@pnhd_studio</a> или
                            позвоните по номеру <a href="tel:+78129046156">+7 (812) 904-61-56</a>.
                        </p>
                    </>
                )}
                {ctaList.length > 0 && (
                    <div className={styles.actions}>
                        {ctaList.map((cta, idx) => {
                            const isExternal = /^https?:\/\//.test(cta.href);
                            // First CTA → outline ("На главную"); subsequent CTA(s) → primary green ("В каталог")
                            const className = idx === 0 ? styles.linkBtn : styles.linkBtnPrimary;
                            if (isExternal) {
                                return (
                                    <a key={cta.id ?? `${cta.href}-${idx}`} href={cta.href} className={className} target="_blank" rel="noopener noreferrer">
                                        {cta.label}
                                    </a>
                                );
                            }
                            return (
                                <Link key={cta.id ?? `${cta.href}-${idx}`} href={cta.href} className={className}>
                                    {cta.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Page;
