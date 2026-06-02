import React from "react";
import styles from './sinceScreen.module.css';

export type SinceScreenProps = {
    title?: string | null;
    highlight?: string | null;
    subtitle?: string | null;
    items?: { title: string; text: string }[] | null;
};

const DEFAULT_TITLE = 'Создаем мерч с 2015 года';
const DEFAULT_HIGHLIGHT = '2015';
const DEFAULT_SUBTITLE =
    'Мы не просто наносим принты — мы воплощаем ваши идеи. От безумных рисунков до личных фраз, которые будут видны издалека. Создаём стильную одежду для вас, ваших друзей и всей семьи, используя передовые технологии.';
const DEFAULT_ITEMS = [
    {
        title: 'Ваша фантазия — наш главный ориентир',
        text: 'Напечатаем даже самый смелый и нестандартный рисунок.',
    },
    {
        title: 'Никто не пройдёт мимо',
        text: 'Сделаем вашу фразу или логотип максимально яркими и заметными.',
    },
    {
        title: 'Заботимся о вас',
        text: 'Печатаем только на качественной и комфортной одежде, приятной телу.',
    },
];

/**
 * Renders the title, wrapping `highlight` substring in <span> for visual emphasis.
 * Falls back to plain title if highlight not found.
 */
function renderTitle(title: string, highlight: string | null | undefined) {
    if (!highlight) return title;
    const idx = title.indexOf(highlight);
    if (idx === -1) return title;
    const before = title.slice(0, idx);
    const after = title.slice(idx + highlight.length);
    return (
        <>
            {before}<span>{highlight}</span>{after}
        </>
    );
}

const SinceScreen: React.FC<SinceScreenProps> = ({ title, highlight, subtitle, items }) => {
    const resolvedTitle = title ?? DEFAULT_TITLE;
    const resolvedHighlight = highlight ?? DEFAULT_HIGHLIGHT;
    const resolvedSubtitle = subtitle ?? DEFAULT_SUBTITLE;
    const resolvedItems = items && items.length > 0 ? items : DEFAULT_ITEMS;

    return (
        <section className={styles.screen}>
            <header className={styles.screen_header}>
                <h2 className={styles.screen_title}>{renderTitle(resolvedTitle, resolvedHighlight)}</h2>
                <p className={styles.screen_subtitle}>{resolvedSubtitle}</p>
            </header>
            <div className={styles.screen_content}>
                {resolvedItems.map((item, index) => (
                    <div key={index} className={styles.screen_content_item}>
                        <h3 className={styles.screen_content_item_title}>{item.title}</h3>
                        <p className={styles.screen_content_item_text}>{item.text}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default SinceScreen;
