"use client";
import React, { useEffect } from "react";
import styles from "./page.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/redux-hooks";
import Controls from "@/components/pages-components/constructor-page/constructor-controls/constructor-controls";
import Stage from "@/components/pages-components/constructor-page/3dmockup/3dmokup";
import DecalComp from "@/components/pages-components/constructor-page/3dmockup/decal";
import Preview from "@/components/pages-components/constructor-page/3dmockup/preview";
import Image from "next/image";
import testImg from '../../../../../public/cookie.jpg'


import dynamic from "next/dynamic";
const DynamicStage = dynamic(
    () => import("../../../../konva-stage/stage-component"),
    { ssr: false }
);

const Constructor = () => {
    const router = useRouter();
    const itemCartId = useSearchParams().get("itemCartId");
    const { order } = useAppSelector((store) => store.cart);
    const orderElement = order?.filter((item) => item.itemCartId === itemCartId)[0];
    const { previewMode } = useAppSelector((store) => store.printConstructor);

    const gallery = [testImg, testImg, testImg, testImg, testImg, testImg];

    //console.log('page render')
    useEffect(() => {
        if (!itemCartId) router.replace("/shop"); //переписать чтоб возвращало на кароточку товара
    }, [itemCartId]);

    return (
        <>
            <div style={{
                background: '#fff4e5',
                border: '1px solid #ffb74d',
                color: '#663c00',
                padding: '12px 16px',
                margin: '12px',
                borderRadius: 8,
                fontFamily: 'Neue_machina, sans-serif',
                fontSize: 14,
                lineHeight: 1.4,
            }}>
                <strong>Демо-режим клона.</strong> Конструктор показывается, но загрузка изображений
                и сохранение в корзину пока недоступны — Supabase Storage и Edge Functions подключим
                следующей итерацией.
            </div>
            <section className={styles.screen}>
                <div className={styles.mockup_container}>
                    <div className={styles.stage_container}>
                        {/* {orderElement?.item && <DynamicStage orderElement={orderElement} />} */}
                        {!previewMode &&
                            <Stage>
                                <DecalComp />
                            </Stage>
                        }
                        {previewMode &&
                            <Preview />
                        }

                    </div>
                </div>
                {itemCartId && <Controls itemCartId={itemCartId} />}
            </section>
            {/* {itemCartId && orderElement && <GallerySelector orderElement={orderElement} />} */}
        </>
    );
};

export default Constructor;
