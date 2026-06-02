'use client'

import { usePathname } from 'next/navigation'
import LeadForm from '../lead-form/lead-form'

// Скрываем footer-форму на тех страницах, где уже есть отдельная primary-форма
// или где она вредит UX (cart/checkout/thanks). На остальных — рендерим как раньше.
const HIDDEN_PATTERNS = [
  /^\/thanks(\/|$)/,
  /^\/cart(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/shop$/, // на /shop уже есть NoModelBlock — дубль не нужен
]

export default function FooterLeadFormSlot({ formId }: { formId: string }) {
  const pathname = usePathname() || '/'
  if (HIDDEN_PATTERNS.some((re) => re.test(pathname))) return null
  return <LeadForm source="footer" formId={formId} />
}
