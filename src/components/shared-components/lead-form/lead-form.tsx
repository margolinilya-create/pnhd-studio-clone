'use client'
import React, { ChangeEvent, FormEvent, useEffect } from "react"
import styles from './lead-form.module.css'
import { useAppDispatch, useAppSelector } from "@/redux/redux-hooks";
import TextField from '@mui/material/TextField';
import { MuiTelInput } from 'mui-tel-input'
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { actions as leadActions } from "@/redux/lead-slice/lead.slice";
import { useCreateLeadMutation } from "@/api/api";
import Link from "next/link";
import Image from "next/image";
import RU_FLAG from '../../../../public/ru_flag.webp';



const LeadForm: React.FC = () => {

    const dispatch = useAppDispatch();
    const { name, phone, isAgreedWithPrivacyPolicy } = useAppSelector(store => store.leads);
    const [ createLead, { isUninitialized, isSuccess, isError, reset} ] = useCreateLeadMutation();

    useEffect(() => {
        const timeout = setTimeout(() => { reset() }, 2000);
        return () => { clearTimeout(timeout) };
    }, [isSuccess])

    const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // TODO(supabase-migration): подключить Edge Function для приёма лидов + Telegram-уведомление.
        // В клоне отправка отключена, чтобы не плодить запросы к недоступному pnhdstudioapi.ru.
        alert('Форма работает в демо-режиме клона. Данные не отправляются.');
        dispatch(leadActions.resetLeadData());
    }

    return (
                    <form className={styles.footer_form} onSubmit={submitHandler}>
                        <span className={styles.form_title}>Заполни форму, мы
                            свяжемся для консультации
                        </span>
                        <TextField 
                            id='name'
                            required
                            autoComplete='off'
                            fullWidth
                            size='small'
                            label='Твоё имя'
                            value={name}
                            sx={{
                                "& .MuiInputLabel-root": { fontFamily: 'Neue_machina' },
                                "& .MuiInputLabel-root.Mui-focused": { color: 'rgb(57,57,57)' }, 
                                "& .MuiOutlinedInput-root.Mui-focused": {
                                  "& > fieldset": { borderColor: 'rgb(57,57,57)' },
                                },
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => { dispatch(leadActions.setUserData({ id: e.target.id, value: e.target.value })) }}
                        />
                        <MuiTelInput
                            onlyCountries={['RU']}
                            fullWidth
                            size='small'
                            autoComplete='off'
                            defaultCountry="RU"
                            label='Твой телефон'
                            required
                            value={phone}
                            disableDropdown
                            sx={{
                                fontFamily: 'Neue_machina',
                                "& .MuiInputLabel-root": { fontFamily: 'Neue_machina' },
                                "& .MuiInputLabel-root.Mui-focused": { color: 'rgb(57,57,57)' }, 
                                "& .MuiOutlinedInput-root.Mui-focused": {
                                  "& > fieldset": { borderColor: 'rgb(57,57,57)' },
                                },
                            }}
                            getFlagElement={() => {
                                return <Image width={26} height={17} alt='ГОЙДААА!' src={RU_FLAG} aria-label='Россия' />
                              }}
                            onChange={(newValue: string) => { dispatch(leadActions.setUserData({ id: 'phone', value: newValue })) }}
                        />
                        <FormControlLabel 
                            control={
                            <Checkbox
                                checked={isAgreedWithPrivacyPolicy}
                                sx={{
                                    "& .MuiInputLabel-root": { fontFamily: 'Neue_machina' },
                                    color: 'rgb(57,57,57)',
                                    '&.Mui-checked': {
                                      color: 'rgb(57,57,57)',
                                    },
                                    fontFamily: 'Neue_machina',
                                }}
                                onChange={() => { dispatch(leadActions.setPrivacyPolicyAgreement()) }}
                            />
                            }
                            sx={{
                                fontFamily: 'Neue_machina',
                                "& .MuiFormControlLabel-root.MuiFormControlLabel-label": { fontFamily: 'Neue_machina' },
                            }}
                            label={<p style={{ margin: 0, padding: 0, fontFamily: 'Neue_machina', fontSize: '14px', lineHeight: '14px'}}>Согласен с <Link target="_blank" style={{color: 'black'}} href='/privacy'>политикой конфиденциальности</Link></p>}
                         />
                         {isUninitialized && <button type='submit' disabled={!isAgreedWithPrivacyPolicy} className={styles.form_submitButton}>проконсультироваться</button>}
                         {isSuccess && <p className={styles.form_statusText}>Заявка отправлена!</p>}
                         {isError && <p className={styles.form_statusText}>Что-то пошло не так :/</p>}
                    </form>
    )
}

export default LeadForm;