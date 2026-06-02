'use client'
import React, { useEffect, useRef, useState } from 'react';
import styles from './product-cards-block.module.css';
import Link from 'next/link';
import { IProduct } from '@/app/utils/types';
import ProductCard from '../product-card/product-card';

// Module-level constant: не пересоздаём при каждом ре-рендере (PR #5)
const OBSERVER_OPTIONS: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px 50px 0px',
    threshold: 0.1,
};

const PAGE_SIZE = 8;

export const ProductCardsBlock: React.FC<{ shopData: Array<IProduct> }> = ({ shopData }) => {
    const [endIndex, setEndIndex] = useState(PAGE_SIZE);
    const observerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && endIndex < shopData.length) {
                setEndIndex((prev) => Math.min(prev + PAGE_SIZE, shopData.length));
            }
        }, OBSERVER_OPTIONS);
        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) observer.unobserve(observerRef.current);
        };
    }, [endIndex, shopData.length]);

    return (
        <>
            <div className={styles.screen}>
                {shopData && shopData.slice(0, endIndex).map((item) => (
                    <Link
                        href={`/shop/${item.slug}`}
                        className={styles.link}
                        key={item._id}
                    >
                        <ProductCard
                            title={item.name}
                            price={item.price}
                            img={item?.image_url ?? ''}
                            sizes={item.sizes}
                            slug={item.slug}
                            badge={item.badge}
                            salePercent={item.salePercent}
                        />
                    </Link>
                ))}
            </div>
            {/* observer elem */}
            <div
                style={{ width: '100%', height: '10px' }}
                ref={observerRef}
            />
        </>
    );
};

export default ProductCardsBlock;
