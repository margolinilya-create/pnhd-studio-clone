import { getCookieBar } from '@/lib/queries/site-settings';
import CookieBarClient from './cookie-bar-client';

const CookieBar = async () => {
    const bar = await getCookieBar();
    if (bar?.enabled === false) return null;
    return (
        <CookieBarClient
            title={bar?.title ?? 'МЫ СОБИРАЕМ КУКИ!'}
            description={bar?.description ?? null}
            buttonLabel={bar?.buttonLabel ?? 'ПОНЯЛ, СОГЛАСЕН!'}
        />
    );
};

export default CookieBar;
