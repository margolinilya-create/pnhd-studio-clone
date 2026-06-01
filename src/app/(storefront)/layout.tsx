import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import InfoBar from "@/components/shared-components/info-bar/info-bar";
import Header from "@/components/shared-components/header/header";
import Footer from "@/components/shared-components/footer/footer";
import MobileMenu from "@/components/shared-components/mobile-menu/mobile-menu";
import CartIcon from "@/components/shared-components/cart-icon/cart-icon";
import Popup from "@/components/shared-components/popup/popup";
import Script from "next/script";
import CookieBar from "@/components/shared-components/cookie-bar/cookie-bar";
import ContactsWidget from "@/components/shared-components/contactsWidget/contactsWidget";
import AgentationLoader from "@/components/shared-components/agentation-loader/agentation-loader";
import { getFormIdBySlug } from "@/lib/forms/get-form-by-slug";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { RefreshRouteOnSave } from "@/components/payload/refresh-route-on-save.client";
import type { Media } from "@/payload-types";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const yandexVerify = settings?.analytics?.yandexVerification ?? '';

  const og = settings?.seo?.defaultOGImage;
  let ogImageUrl: string | null = null;
  if (og && typeof og !== 'number') {
    ogImageUrl = (og as Media).url ?? null;
  }

  return {
    verification: yandexVerify ? { yandex: yandexVerify } : undefined,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pnhd-studio-clone.vercel.app'),
    openGraph: ogImageUrl ? { images: [{ url: ogImageUrl }] } : undefined,
  };
}

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Soft-fail: если seed-forms ещё не прогнан или Forms-коллекция недоступна (DB outage),
  // не валим весь storefront — LeadForm получит пустой formId и submit упадёт на API-уровне
  // у конкретного юзера, но страница отрендерится. Логируем для observability.
  const resolveFormId = async (slug: 'footer-lead' | 'popup-lead'): Promise<string> => {
    try {
      return await getFormIdBySlug(slug);
    } catch (err) {
      console.error(`StorefrontLayout: failed to resolve form "${slug}"`, err);
      return '';
    }
  };
  const [footerFormId, popupFormId, settings] = await Promise.all([
    resolveFormId('footer-lead'),
    resolveFormId('popup-lead'),
    getSiteSettings(),
  ]);

  const roistatId = settings?.analytics?.roistatId ?? '';
  const yandexMetricaId = settings?.analytics?.yandexMetricaId ?? '';
  const uiscomKey = settings?.analytics?.uiscomKey ?? '';

  return (
    <div className={inter.className}>
      <RefreshRouteOnSave />
      <ContactsWidget />
      <Suspense>
        <InfoBar />
      </Suspense>
      <Suspense>
        <CookieBar />
      </Suspense>
      <Popup formId={popupFormId} />
      <MobileMenu />
      <main>
        <CartIcon />

        <Header />
        {children}
        <Footer formId={footerFormId} />
      </main>
      {roistatId && (
        <Script id='roistat'>
          {`(function(w, d, s, h, id) {
              w.roistatProjectId = id;
              w.roistatHost = h;
              var p = d.location.protocol == "https:" ? "https://" : "http://";
              var u = /^.*roistat_visit=[^;]+(.*)?$/.test(d.cookie) ? "/dist/module.js" : "/api/site/1.0/"+id+"/init?referrer="+encodeURIComponent(d.location.href);
              var js = d.createElement(s);
              js.charset="UTF-8";
              js.async = 1;
              js.src = p+h+u;
              var js2 = d.getElementsByTagName(s)[0];
              js2.parentNode.insertBefore(js, js2);
          })(window, document, 'script', 'cloud.roistat.com', '${roistatId}');`
          }
        </Script>
      )}
      {yandexMetricaId && (
        <Script async id="metrika-counter" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(${yandexMetricaId}, "init", {
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true,
              webvisor:true,
              ecommerce:"dataLayer"
        });
        window.dataLayer = window.dataLayer || [];
        `}
        </Script>
      )}
      {uiscomKey && (
        <Script type="text/javascript" async src={`https://app.uiscom.ru/static/cs.min.js?k=${uiscomKey}`}></Script>
      )}
      <AgentationLoader />
    </div>
  );
}
