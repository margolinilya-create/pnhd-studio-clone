'use client'
import React, { useCallback, useMemo } from "react";
import styles from './products-filter.module.css';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCardsBlock from "../product-cards-block/product-cards-block";
import { IProduct } from "@/app/utils/types";

const filterParams = {
    category: [
        { name: 'Мужское', value: 'man' },
        { name: 'Женское', value: 'woman' },
        { name: 'Детское', value: 'kids' },
        { name: 'Аксессуары', value: 'accesorize' },
    ],
    type: [
        { name: 'Футболка', value: 'tshirt' },
        { name: 'Лонгслив', value: 'longsleeve' },
        { name: 'Свитшот', value: 'sweatshirt' },
        { name: 'Худи', value: 'hoodie' },
        { name: 'Шоппер', value: 'totebag' },
        { name: 'Кепка', value: 'cap' },
    ],
} as const;

const priceOptions = [
    { name: '↑ по возрастанию', value: 'ASC' as const },
    { name: '↓ по убыванию', value: 'DESC' as const },
];

type FilterState = { category: string; type: string; priceSort: string };

function buildQueryString(state: FilterState): string {
    const parts: string[] = [];
    if (state.category) parts.push(`category=${encodeURIComponent(state.category)}`);
    if (state.type) parts.push(`type=${encodeURIComponent(state.type)}`);
    if (state.priceSort) parts.push(`priceSort=${encodeURIComponent(state.priceSort)}`);
    return parts.length ? `?${parts.join('&')}` : '';
}

function applyFilters(shopData: IProduct[], state: FilterState): IProduct[] {
    let data = [...shopData];
    if (state.category) data = data.filter((item) => item.category === state.category);
    if (state.type) data = data.filter((item) => item.type === state.type);
    if (state.priceSort === 'ASC') data.sort((a, b) => a.price - b.price);
    if (state.priceSort === 'DESC') data.sort((a, b) => b.price - a.price);
    return data;
}

const ProductFilterComp: React.FC<{ children?: React.ReactNode; shopData: Array<IProduct> }> = ({
    children,
    shopData,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Читаем URL напрямую в render — устраняет race condition
    // useState/useEffect, при котором pills не подсвечивались сразу после
    // hydration (см. BUG-007). SSR-фильтрация в /shop/page.tsx уже отдаёт
    // правильно отфильтрованный shopData, applyFilters здесь идемпотентно
    // прогоняет тот же subset для безопасности.
    const filterState: FilterState = {
        category: searchParams?.get('category') || '',
        type: searchParams?.get('type') || '',
        priceSort: searchParams?.get('priceSort') || '',
    };
    const isFiltered = Boolean(
        filterState.category || filterState.type || filterState.priceSort,
    );
    const filteredData = useMemo<IProduct[] | null>(() => {
        if (!isFiltered) return null;
        return applyFilters(shopData, filterState);
    }, [shopData, filterState.category, filterState.type, filterState.priceSort, isFiltered]);

    const navigateWithState = useCallback(
        (next: FilterState) => {
            router.push(`/shop${buildQueryString(next)}`);
        },
        [router]
    );

    const onCategoryPill = (value: string) => {
        if (filterState.category === value) {
            navigateWithState({ ...filterState, category: '' });
            return;
        }
        navigateWithState({ ...filterState, category: value });
    };

    const onTypePill = (value: string) => {
        if (filterState.type === value) {
            navigateWithState({ ...filterState, type: '' });
            return;
        }
        navigateWithState({ ...filterState, type: value });
    };

    const onPricePill = (sort: 'ASC' | 'DESC') => {
        if (filterState.priceSort === sort) {
            navigateWithState({ ...filterState, priceSort: '' });
            return;
        }
        navigateWithState({ ...filterState, priceSort: sort });
    };

    const resetFilterButtonClickHandler = () => {
        router.push('/shop');
    };

    return (
        <section className={styles.main}>
            <header className={styles.header}>
                <p className={styles.breadcrumbs}>
                    <Link href="/">Главная</Link>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span>Каталог</span>
                </p>
                <h1 className={styles.title}>Каталог</h1>
            </header>

            <div className={styles.filters}>
                <div className={styles.filterBar} role="group" aria-label="Фильтры каталога">
                    <div className={styles.filterGroup}>
                        <span className={styles.groupLabel}>Категория</span>
                        <div className={styles.pills}>
                            {filterParams.category.map((item) => {
                                const active = filterState.category === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`${styles.pill} ${active ? styles.pillActive : ''}`}
                                        onClick={() => onCategoryPill(item.value)}
                                        aria-pressed={active}
                                    >
                                        {item.name}
                                        {active && (
                                            <span className={styles.pillClear} aria-hidden>
                                                ×
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${styles.filterGroup} ${styles.filterGroupTypes}`}>
                        <span className={styles.groupLabel}>Тип</span>
                        <div className={styles.pills}>
                            {filterParams.type.map((item) => {
                                const active = filterState.type === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`${styles.pill} ${active ? styles.pillActive : ''}`}
                                        onClick={() => onTypePill(item.value)}
                                        aria-pressed={active}
                                    >
                                        {item.name}
                                        {active && (
                                            <span className={styles.pillClear} aria-hidden>
                                                ×
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${styles.filterGroup} ${styles.filterGroupPrice}`}>
                        <span className={styles.groupLabel}>Цена</span>
                        <div className={styles.pills}>
                            {priceOptions.map((item) => {
                                const active = filterState.priceSort === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`${styles.pill} ${active ? styles.pillActive : ''}`}
                                        onClick={() => onPricePill(item.value)}
                                        aria-pressed={active}
                                    >
                                        {item.name}
                                        {active && (
                                            <span className={styles.pillClear} aria-hidden>
                                                ×
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.formActions}>
                <button
                    type="button"
                    className={styles.filters_submitButton}
                    onClick={resetFilterButtonClickHandler}
                >
                    сбросить
                </button>
            </div>

            {isFiltered && filteredData ? (
                <ProductCardsBlock shopData={filteredData} />
            ) : (
                <>{children}</>
            )}
        </section>
    );
};

export default ProductFilterComp;
