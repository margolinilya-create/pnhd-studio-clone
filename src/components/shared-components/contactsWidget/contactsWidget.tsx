import React from 'react';
import { getSiteSettings } from '@/lib/queries/site-settings';
import ContactsWidgetClient from './contactsWidget-client';

const ContactsWidget = async () => {
    const settings = await getSiteSettings();
    const social = settings?.social;

    return (
        <ContactsWidgetClient
            telegramUrl={social?.telegramUrl ?? 'https://t.me/pnhd_studio'}
            telegramLabel={social?.telegramLabel ?? 'Написать в Телеграм'}
            whatsappUrl={social?.whatsappUrl ?? 'https://wa.me/79313566552'}
            whatsappLabel={social?.whatsappLabel ?? 'Написать в Ватсап'}
            maxUrl={social?.maxUrl ?? ''}
            maxLabel={social?.maxLabel ?? 'Написать в MAX'}
        />
    );
};

export default ContactsWidget;
