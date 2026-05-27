'use client'
import React from "react"
import styles from './lead-button.module.css';
import { actions as utilsActions } from "@/redux/utils-slice/utils.slice";
import { useAppDispatch } from "@/redux/redux-hooks";




interface LeadButtonProps {
    styleType: 'green' | 'white';
    label?: string;
    popupTitle?: string;
}

const LeadButton: React.FC<LeadButtonProps> = ({
    styleType,
    label = 'проконсультироваться',
    popupTitle = 'Воплощай смелые идеи с любым методом нанесения',
}) => {
    const dispatch = useAppDispatch()
    const buttonStyle = styleType === 'green' ?
        styles.leadButton__green : styleType === 'white' ?
        styles.leadButton__white : styles.leadButton__green;

    const leadButtonClickHandler = () => {
        dispatch(utilsActions.setPopupVisibility());
        dispatch(utilsActions.setPopupType('lead'));
        dispatch(utilsActions.setPopupTitle(popupTitle));
    }

    return (
        <button className={buttonStyle} onClick={leadButtonClickHandler}>{label}</button>
    )
}

export default LeadButton;