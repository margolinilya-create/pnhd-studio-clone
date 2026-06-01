'use client'
import React, { useState } from "react"
import styles from './contactsWidget.module.css'
import Link from "next/link"
import Image from "next/image"
import vk from '../../../../public/vk_logo.svg';
import tg from '../../../../public/tg_logo.svg';
import inst from '../../../../public/inst_logo.svg';
import wa from '../../../../public/wa_logo.svg';

const ContactsWidget = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

    return (
        <div className={styles.contactsWidget}>
            {isMenuOpen && (
                <ul className={styles.contactsWidget_menu}>
                    {/* <li className={styles.contactsWidget_menuItem}>
                    <Link href='tel:+78129046156' className={styles.contactsWidget_menuItem_link}>+7 (812) 904 61 56</Link>
                </li> */}
                    {/* <li className={styles.contactsWidget_menuItem}>
                    <Link href='https://vk.com/pinheadspb' target="blank">
                        <button type='button' className={styles.contacts_socialButton}>
                            <Image src={vk} alt='логотип вконтакте' />
                        </button>
                    </Link>
                </li> */}
                    <li className={styles.contactsWidget_menuItem}>
                        <Link href='https://t.me/pnhd_studio' target="blank" className={styles.contactsWidget_menuItemLink}>
                            <Image src={tg} alt='логотип телеграм' width={20} height={20} />
                            Написать в Телеграм
                        </Link>
                    </li>
                    {/* <li className={styles.contactsWidget_menuItem}>
                    <Link href='https://instagram.com/pnhd.studio/' target="blank">
                        <button type='button' className={styles.contacts_socialButton}>
                            <Image src={inst} alt='логотип инстаграм' />
                        </button>
                    </Link>
                </li> */}
                    <li className={styles.contactsWidget_menuItem}>
                        <Link href='https://wa.me/79313566552' target="blank" className={styles.contactsWidget_menuItemLink}>
                            <Image src={wa} alt='логотип ватсап' width={20} height={20} />
                            Написать в Ватсап
                        </Link>
                    </li>
                    <li className={styles.contactsWidget_menuItem}>
                        <Link href='https://max.ru/u/f9LHodD0cOLPoya-nl--At_duzt7fmJjN6-3xbnFVdcytMmjXzFDz4fRzDU' target="blank" className={styles.contactsWidget_menuItemLink}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_1629_53)">
                                    <path d="M20.0002 5.27778V14.7222C19.9927 14.8136 19.9849 14.905 19.9774 14.9964C19.938 15.4658 19.9322 15.9411 19.8533 16.4039C19.5905 17.9417 18.6788 18.9806 17.2844 19.6158C16.7558 19.8567 16.1799 19.9089 15.6063 19.9472C15.3119 19.9669 15.0172 19.9825 14.7224 20H5.19466C5.14521 19.9928 5.09604 19.9839 5.04632 19.9789C4.46743 19.9206 3.8766 19.9175 3.31216 19.7939C2.0316 19.5131 1.13354 18.7075 0.514933 17.5747C0.197155 16.9933 0.111044 16.3508 0.0593772 15.7028C0.0354883 15.4042 0.0199327 15.1047 0.000488281 14.8058C0.000488281 11.5928 0.000488281 8.38 0.000488281 5.16694C0.00798828 5.1175 0.0185438 5.06806 0.0221549 5.01833C0.0510438 4.62667 0.0654883 4.23333 0.109377 3.84306C0.279377 2.32389 1.10354 1.25083 2.41354 0.522222C3.00993 0.190278 3.67188 0.1075 4.33882 0.0555556C4.61466 0.0341667 4.89077 0.0183333 5.16688 0C8.36132 0 11.5558 0 14.7502 0C14.8233 0.00722222 14.8963 0.0158333 14.9694 0.0219444C15.448 0.0616667 15.933 0.0647222 16.4044 0.146667C17.9685 0.418333 19.0174 1.34972 19.6419 2.78056C19.8549 3.26833 19.9041 3.79861 19.943 4.32528C19.9663 4.6425 19.9813 4.96056 19.9999 5.27806L20.0002 5.27778ZM6.77771 16.3372C6.79466 16.3442 6.80382 16.3464 6.81132 16.3511C6.83049 16.3639 6.84938 16.3775 6.86799 16.3914C7.6416 16.9631 8.48271 17.3386 9.46354 17.4006C10.9594 17.4953 12.376 17.2436 13.6913 16.5158C15.3438 15.6017 16.5035 14.2528 17.1527 12.4783C17.6188 11.2044 17.713 9.89306 17.4769 8.55861C17.1733 6.84139 16.3855 5.38083 15.083 4.22556C13.3188 2.66111 11.2402 2.09639 8.91854 2.42667C7.8366 2.58056 6.82993 2.96139 5.90438 3.55083C4.58299 4.3925 3.6066 5.52611 2.98743 6.96667C2.34715 8.45611 2.3166 10.0075 2.51215 11.5828C2.62271 12.4744 2.84549 13.3414 3.07965 14.2067C3.30938 15.0553 3.49965 15.91 3.50577 16.7972C3.50771 17.0672 3.66216 17.2661 3.91521 17.3736C4.19438 17.4922 4.48604 17.4839 4.77466 17.4267C5.55216 17.2731 6.23104 16.9333 6.77771 16.3375V16.3372Z" fill="black" />
                                    <path d="M8.00464 13.066C7.7288 13.276 7.48408 13.4813 7.22019 13.6577C6.95797 13.833 6.8263 13.7905 6.67463 13.5102C6.45186 13.0985 6.35713 12.6455 6.27908 12.1902C6.14852 11.4296 6.11602 10.6624 6.19852 9.8963C6.3188 8.78158 6.70352 7.78074 7.54325 6.99602C8.08269 6.49185 8.72075 6.18491 9.45019 6.08657C10.6399 5.92602 11.6971 6.24019 12.5941 7.03935C13.3177 7.68435 13.751 8.4938 13.8649 9.46296C14.1116 11.5607 12.5616 13.3085 10.726 13.6463C9.8088 13.8152 8.96491 13.6444 8.17241 13.1707C8.11297 13.1352 8.05352 13.0994 7.99408 13.0641C7.99047 13.0621 7.98575 13.0624 8.00464 13.066Z" fill="black" />
                                </g>
                                <defs>
                                    <clipPath id="clip0_1629_53">
                                        <rect width="20" height="20" fill="white" />
                                    </clipPath>
                                </defs>
                            </svg>

                            Написать в MAX
                        </Link>
                    </li>
                </ul>
            )}
            <button
                type="button"
                className={styles.contactsWidget_icon}
                onClick={toggleMenu}
                aria-label={isMenuOpen ? 'Закрыть меню контактов' : 'Открыть меню контактов'}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
            >
                <svg width="20" height="20" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                    <path fillRule="evenodd" clipRule="evenodd" d="M57 -1e-07H21C19.35 -1e-07 18 1.35 18 3V33C18 34.65 19.35 36 21 36H37.77L48.9 47.13C49.41 47.67 50.16 48 51 48C52.65 48 54 46.65 54 45V36H57C58.65 36 60 34.65 60 33V3C60 1.35 58.65 -1e-07 57 -1e-07ZM21 39C17.7 39 15 36.3 15 33V12H3C1.35 12 -1e-07 13.35 -1e-07 15V45C-1e-07 46.65 1.35 48 3 48H6V57C6 58.65 7.35 60 9 60C9.84 60 10.59 59.67 11.13 59.13L22.23 48H39C40.65 48 42 46.65 42 45V44.49L36.51 39H21Z" fill="#040404" />
                </svg>
            </button>
        </div>
    )
}

export default ContactsWidget;