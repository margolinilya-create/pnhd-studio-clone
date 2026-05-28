"use client";
import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import styles from "./loyalty-carousel.module.css";

const cards = [
    {
        title: "Приветственные бонусы",
        content: (
            <>
                <p>После регистрации вам начисляется <strong>500 бонусов</strong>. Их можно использовать при следующем заказе.</p>
                <Link href="https://t.me/pnhd_bonus_bot" target="_blank" className={styles.card_link}>Зарегистрироваться</Link>
            </>
        ),
    },
    {
        title: "Срок действия",
        content: (
            <p>Бонусы действуют в течение ограниченного времени с момента начисления. Точный срок может зависеть от типа бонусов и условий акции.</p>
        ),
    },
    {
        title: "Как начисляются бонусы",
        content: (
            <>
                <p>Бонусы начисляются:</p>
                <ul>
                    <li>за каждый оплаченный заказ</li>
                    <li>в соответствии с вашим уровнем</li>
                </ul>
                <p>Бонусы начисляются после оплаты заказа и могут отображаться с небольшой задержкой.</p>
            </>
        ),
    },
    {
        title: "Как использовать бонусы",
        content: (
            <>
                <p>Вы можете оплатить бонусами до 50% стоимости заказа. Для этого:</p>
                <ul>
                    <li>при оформлении заказа назовите номер телефона</li>
                    <li>сообщите администратору, что хотите списать бонусы</li>
                </ul>
            </>
        ),
    },
    {
        title: "Как рассчитывается уровень",
        content: (
            <p>Чем больше вы печатаете — тем выше ваш уровень и тем больше бонусов вы получаете с каждого заказа. Уровень повышается автоматически при достижении нужной суммы. Новые клиенты начинают с базового уровня и постепенно открывают более выгодные условия.</p>
        ),
    },
    {
        title: "Важно знать",
        content: (
            <ul>
                <li>бонусы начисляются только после оплаты заказа</li>
                <li>бонусы не обмениваются на деньги</li>
                <li>бонусы не передаются другим лицам</li>
                <li>при возврате заказа бонусы могут быть списаны</li>
            </ul>
        ),
    },
    {
        title: "Технические моменты",
        content: (
            <>
                <p>Если у вас не отображаются бонусы или уровень:</p>
                <ul>
                    <li>проверьте номер телефона</li>
                    <li><Link href="https://t.me/pnhd_bonus_bot" target="_blank" className={styles.inline_link}>попробуйте повторно авторизоваться</Link></li>
                    <li>или обратитесь к администратору</li>
                </ul>
                <p>Начисление обычно происходит сразу после оплаты, в отдельных случаях — до 24 часов.</p>
            </>
        ),
    },
];

const LoyaltyCarousel: React.FC = () => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    const scrollTo = (index: number) => {
        const track = trackRef.current;
        if (!track) return;
        const card = track.children[index] as HTMLElement;
        track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
        setActive(index);
    };

    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const cardWidth = (track.children[0] as HTMLElement)?.offsetWidth ?? 0;
        const index = Math.round(track.scrollLeft / (cardWidth + 10));
        setActive(index);
    };

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        track.addEventListener("scroll", onScroll, { passive: true });
        return () => track.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <section className={styles.carousel_section}>
            <div className={styles.track} ref={trackRef}>
                {cards.map((card, i) => (
                    <div key={i} className={styles.card}>
                        <h2 className={styles.card_title}>{card.title}</h2>
                        <div className={styles.card_body}>{card.content}</div>
                    </div>
                ))}
            </div>
            <div className={styles.dots}>
                {cards.map((_, i) => (
                    <button
                        key={i}
                        className={`${styles.dot} ${i === active ? styles.dot_active : ""}`}
                        onClick={() => scrollTo(i)}
                        aria-label={`Слайд ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};

export default LoyaltyCarousel;
