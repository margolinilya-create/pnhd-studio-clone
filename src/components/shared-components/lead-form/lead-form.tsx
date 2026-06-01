'use client'
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react"
import styles from './lead-form.module.css'
import { useAppDispatch, useAppSelector } from "@/redux/redux-hooks";
import TextField from '@mui/material/TextField';
import { MuiTelInput } from 'mui-tel-input'
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { actions as leadActions } from "@/redux/lead-slice/lead.slice";
import { type LeadSource } from "@/api/api";
import { getRoistatVisit } from "@/lib/analytics/roistat";
import { submitForm } from "@/lib/forms/submit-form";
import Link from "next/link";
import Image from "next/image";
import RU_FLAG from '../../../../public/ru_flag.webp';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'rate-limit';

const LeadForm: React.FC<{ source?: LeadSource; formId: string }> = ({ source = 'popup', formId }) => {

    const dispatch = useAppDispatch();
    const { name, phone, isAgreedWithPrivacyPolicy } = useAppSelector(store => store.leads);
    const [status, setStatus] = useState<SubmitStatus>('idle');

    useEffect(() => {
        if (status !== 'success') return;
        const timeout = setTimeout(() => {
            setStatus('idle');
            dispatch(leadActions.resetLeadData());
        }, 2000);
        return () => { clearTimeout(timeout) };
    }, [status, dispatch])

    const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (status === 'submitting') return;
        if (!isAgreedWithPrivacyPolicy) return;

        setStatus('submitting');
        try {
            const roistat = getRoistatVisit();
            await submitForm({
                formId,
                fields: {
                    name: name.trim(),
                    phone: phone.replaceAll(' ', ''),
                    source,
                    ...(roistat ? { roistatVisit: roistat } : {}),
                },
            });
            setStatus('success');
        } catch (err) {
            if (err instanceof Error && err.message === 'rate-limit') {
                setStatus('rate-limit');
            } else {
                setStatus('error');
            }
        }
    }

    const isLoading = status === 'submitting';
    const isSuccess = status === 'success';
    const isError = status === 'error';
    const isRateLimit = status === 'rate-limit';

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
                         {!isSuccess && (
                           <button
                             type='submit'
                             disabled={!isAgreedWithPrivacyPolicy || isLoading}
                             className={styles.form_submitButton}
                           >
                             {isLoading ? 'Отправляем…' : (isError || isRateLimit) ? 'Попробовать ещё раз' : 'проконсультироваться'}
                           </button>
                         )}
                         {isSuccess && <p className={styles.form_statusText}>Заявка отправлена!</p>}
                         {isError && <p className={styles.form_statusText} role='alert'>Что-то пошло не так. Попробуйте ещё раз.</p>}
                         {isRateLimit && <p className={styles.form_statusText} role='alert'>Слишком много заявок, подождите минуту и попробуйте снова.</p>}
                    </form>
    )
}

export default LeadForm;
