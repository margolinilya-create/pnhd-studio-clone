import React from "react";
import styles from './shop-lead-screen.module.css';

import Link from "next/link";

import Image from "next/image";
import shop_screen_left_shape from '../../../../../public/shop_lead_left_shape.svg'
import shop_screen_right_shape from '../../../../../public/shop_lead_right_shape.svg'
import shop_lead_main_photo from '../../../../../public/shop_lead_main_photo.png'
import TeeClient from '../main-screen/tee-client';




const ShopLeadScreen: React.FC = () => {

    return (
        <section className={styles.screen}>
            <h2 className={styles.screen_titleWrapper}>
                <span className={styles.screen_title}>
                    открой каталог и закажи одежду с уникальными
                </span>
                <span className={styles.screen_subtitle}>
                    принтами
                </span>
            </h2>

            <div className={styles.screen_box}>
                <div className={styles.box_shapeWrapper}>
                    <Image src={shop_screen_left_shape} alt='графическая форма' className={styles.box_shape} />
                </div>
                <Link href='/shop' className={styles.box_link}>
                    <button className={styles.box_linkButton}>перейти в каталог</button>
                </Link>
                <div className={styles.box_shapeWrapper}>
                    <Image src={shop_screen_right_shape} alt='графическая форма' className={styles.box_shape} />
                </div>
                <div className={styles.box_imageWrapper}>
                    <TeeClient backdropStatus={false} fov={15} />
                    {/* <Image src={shop_lead_main_photo} alt='футболка с принтом' className={styles.box_image} /> */}
                </div>
            </div>
        </section>
    )
}

export default ShopLeadScreen;