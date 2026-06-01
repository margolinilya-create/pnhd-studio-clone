'use client'
import React from 'react';
import styles from './popup.module.css';
import { useAppSelector } from '@/redux/redux-hooks';
import LeadForm from '../lead-form/lead-form';
import { useAppDispatch } from '@/redux/redux-hooks';
import { actions as utilsActions } from '@/redux/utils-slice/utils.slice';





const Popup = ({ formId }: { formId: string }) => {
    const dispatch = useAppDispatch()
    const { isPopupVisible, popupTitle, popupType } = useAppSelector(store => store.utils)
    const popupStyles = isPopupVisible ? styles.popup : styles.popup__disabled;

    const closeButtonClickHandler = () => {
        dispatch(utilsActions.setPopupVisibility());
        dispatch(utilsActions.setPopupTitle(''));
        dispatch(utilsActions.setPopupType(''));
    }

    return (
        <div className={popupStyles}>
            <div className={styles.popup_box}>
                <button
                    className={styles.popup_closeButton}
                    onClick={closeButtonClickHandler}
                >
                    X
                </button>
                <p className={styles.popup_title}>
                    {popupTitle}
                </p>
                {popupType === 'lead' && <LeadForm formId={formId} />}
            </div>
        </div>
    )
}

export default Popup;