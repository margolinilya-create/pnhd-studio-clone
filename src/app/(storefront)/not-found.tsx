import React from 'react'
import styles from './not-found.module.css'
import Link from 'next/link'


const NotFound: React.FC = async () => {

    return (
        <section className={styles.notFound}>
            <div className={styles.notFound_box}>
                <h1 className={styles.notFound_title}>404</h1>
                <p className={styles.notFound_text}>Уууупс....похоже что такой страницы не существует OwO</p>
                <Link href='/' className={styles.notFound_link}>
                    <p className={styles.notFound_text}>Вернемся на главную?</p>
                </Link>
            </div>
        </section>
    )
}

export default NotFound;