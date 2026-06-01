import { getNavItemsFor, getSiteSettings } from "@/lib/queries/site-settings";
import MobileMenuClient, { type MobileMenuItem } from "./mobile-menu-client";

const MobileMenu = async () => {
    const [settings, navItems] = await Promise.all([
        getSiteSettings(),
        getNavItemsFor('mobile'),
    ]);

    const mobileCTALabel = settings?.mobileCTALabel ?? 'проконсультироваться';
    const defaultPopupTitle = settings?.defaultPopupTitle ?? 'Получите консультацию';
    const wholesaleUrl = settings?.wholesaleUrl ?? 'https://pnhd.ru';
    // Legacy label retained from previous hardcode. Spec doesn't expose a dedicated
    // "wholesale label" field on SiteSettings, so we keep the inline copy.
    const wholesaleLabel = 'корпоративный отдел';

    const items: MobileMenuItem[] = navItems.map((item) => ({
        label: item.label,
        href: item.href,
        hash: item.hash ?? null,
        isExternal: item.isExternal ?? false,
    }));

    return (
        <MobileMenuClient
            navItems={items}
            wholesaleUrl={wholesaleUrl}
            wholesaleLabel={wholesaleLabel}
            mobileCTALabel={mobileCTALabel}
            defaultPopupTitle={defaultPopupTitle}
        />
    );
};

export default MobileMenu;
