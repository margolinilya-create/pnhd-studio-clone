import styles from './NoModelBlock.module.css';
import Image from 'next/image';
import NoModelBlockForm from './NoModelBlockForm';

const NoModelBlock = ({ formId }: { formId: string }) => {
    return (
        <section className={styles.noModelBlock}>
            <div className={styles.noModelBlock_content}>
                <p className="">Не нашли<br />желаемую модель?</p>
                <span>
                    Не проблема. Опиши свою мечту —<br />
                    и мы разработаем для вас идеальную модель.
                </span>
                <div className={styles.noModelBlock_content_img}>
                    <Image src="/NoModelBlockCover.png" alt='no model' width="629" height="279" />
                </div>
            </div>
            <div className={styles.noModelBlock_form}>
                <NoModelBlockForm formId={formId} />
            </div>
        </section>
    )
}

export default NoModelBlock;