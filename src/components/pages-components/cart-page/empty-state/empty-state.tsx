import Link from 'next/link';
import styles from './empty-state.module.css';

export type EmptyStateProps = {
  title: string;
  subtitle?: string | null;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
}) => (
  <section className={styles.box} role="region" aria-labelledby="empty-state-title">
    <h1 id="empty-state-title" className={styles.title}>{title}</h1>
    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    <div className={styles.ctaRow}>
      <Link href={ctaHref} className={styles.ctaPrimary}>{ctaLabel}</Link>
      {secondaryCtaLabel && secondaryCtaHref && (
        <Link href={secondaryCtaHref} className={styles.ctaSecondary}>{secondaryCtaLabel}</Link>
      )}
    </div>
  </section>
);

export default EmptyState;
