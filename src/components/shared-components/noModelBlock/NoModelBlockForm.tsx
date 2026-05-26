'use client';

import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import styles from './NoModelBlock.module.css';
import TextField from '@mui/material/TextField';
import { MuiTelInput } from 'mui-tel-input';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from 'next/link';
import Image from 'next/image';
import RU_FLAG from '../../../../public/ru_flag.webp';
import { useCreateLeadMutation } from '@/api/api';
import { getRoistatVisit } from '@/lib/analytics/roistat';

const muiFieldSx = {
  '& .MuiInputLabel-root': { fontFamily: 'Neue_machina' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(57,57,57)' },
  '& .MuiOutlinedInput-root.Mui-focused': {
    '& > fieldset': { borderColor: 'rgb(57,57,57)' },
  },
  '& .MuiOutlinedInput-root': { fontFamily: 'Neue_machina' },
} as const;

const NoModelBlockForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [isAgreed, setIsAgreed] = useState(true);
  const [createLead, { isUninitialized, isSuccess, isError, reset }] = useCreateLeadMutation();

  useEffect(() => {
    const t = setTimeout(() => reset(), 2000);
    return () => clearTimeout(t);
  }, [isSuccess, reset]);

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createLead({
        source: 'shop-no-model',
        name: name.trim(),
        phone: phone.replaceAll(' ', ''),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        roistat_visit: getRoistatVisit() || undefined,
      }).unwrap();
      setName('');
      setPhone('');
      setEmail('');
      setComment('');
    } catch {
      /* статус покажет RTK mutation */
    }
  };

  return (
    <form className={styles.customOrderForm} onSubmit={submitHandler}>
      <div className={styles.formRow2}>
        <TextField
          id="custom-order-name"
          required
          autoComplete="name"
          fullWidth
          size="small"
          label="Твоё имя *"
          InputLabelProps={{ required: false }}
          value={name}
          sx={muiFieldSx}
          onChange={(ev: ChangeEvent<HTMLInputElement>) => setName(ev.target.value)}
        />
        <MuiTelInput
          onlyCountries={['RU']}
          fullWidth
          size="small"
          autoComplete="tel"
          defaultCountry="RU"
          label="Твой телефон *"
          required
          InputLabelProps={{ required: false }}
          value={phone}
          disableDropdown
          sx={{ ...muiFieldSx, fontFamily: 'Neue_machina' }}
          getFlagElement={() => (
            <Image width={26} height={17} alt="Россия" src={RU_FLAG} />
          )}
          onChange={setPhone}
        />
      </div>
      <TextField
        id="custom-order-email"
        autoComplete="email"
        fullWidth
        size="small"
        type="email"
        label="Почта"
        placeholder="Это необязательно"
        value={email}
        sx={muiFieldSx}
        onChange={(ev: ChangeEvent<HTMLInputElement>) => setEmail(ev.target.value)}
      />
      <TextField
        id="custom-order-comment"
        fullWidth
        size="small"
        multiline
        minRows={6}
        label="Комментарий"
        placeholder="Опиши изделие своей мечты"
        value={comment}
        sx={muiFieldSx}
        onChange={(ev: ChangeEvent<HTMLInputElement>) => setComment(ev.target.value)}
      />
      {isUninitialized && (
        <button
          type="submit"
          disabled={!isAgreed}
          className={styles.submitOrder}
        >
          Оформить заказ
        </button>
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={isAgreed}
            onChange={() => setIsAgreed((v) => !v)}
            sx={{
              color: 'rgb(57,57,57)',
              '&.Mui-checked': { color: 'rgb(57,57,57)' },
            }}
          />
        }
        className={styles.consentLabel}
        label={
          <span className={styles.consentText}>
            Нажимая на кнопку Оформить заказ, вы соглашаетесь с{' '}
            <Link className={styles.consentLink} href="/privacy" target="_blank">
              политикой обработки персональных данных
            </Link>
          </span>
        }
      />
      {isSuccess && <p className={styles.formStatus}>Заявка отправлена!</p>}
      {isError && <p className={styles.formStatus}>Что-то пошло не так :/</p>}
    </form>
  );
};

export default NoModelBlockForm;
