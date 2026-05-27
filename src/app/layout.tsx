import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/redux/redux-provider";
import InfoBar from "@/components/shared-components/info-bar/info-bar";
import Header from "@/components/shared-components/header/header";
import Footer from "@/components/shared-components/footer/footer";
import MobileMenu from "@/components/shared-components/mobile-menu/mobile-menu";
import CartIcon from "@/components/shared-components/cart-icon/cart-icon";
import Popup from "@/components/shared-components/popup/popup";
import Script from "next/script";
import CookieBar from "@/components/shared-components/cookie-bar/cookie-bar";
import {headers} from "next/headers";
import {textileOptions} from "@/app/utils/textile-options-data";
import {getCurrentPath} from '@/app/utils/constants';
import {SITE_INFO} from "@/app/constants";
import ContactsWidget from "@/components/shared-components/contactsWidget/contactsWidget";
import dynamic from "next/dynamic";

// Agentation toolbar даёт +417 KB JS-чанка; в prod-сборку не включаем.
// Условие константно на этапе build (process.env.NODE_ENV инлайнится), поэтому
// в prod-build Webpack статически выкидывает обе ветки dynamic + import.
const Agentation =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), {
        ssr: false,
      })
    : () => null;

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  let path = getCurrentPath()

  return {
    verification: {
      yandex: "35381404e7bfd3a4",
      //google: "M4lIu49eO2o_XQZ5jyQ3zNkORxQftkEpEvf0E04pRFU",
    },
    alternates: {
      canonical: SITE_INFO.domain + '/' + path.join('/'),
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // x-pathname выставляется middleware. На admin-роутах публичную обёртку
  // (header/footer/analytics) не рендерим — у админки свой layout.
  const pathname = headers().get('x-pathname') ?? '';
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <html lang="ru">
        <ReduxProvider>
          <body className={inter.className}>
            {children}
            <Agentation />
          </body>
        </ReduxProvider>
      </html>
    );
  }

  return (
    <html lang="ru">
      <ReduxProvider>
        <body className={inter.className}>
          <ContactsWidget />
          <Suspense>
            <InfoBar />
          </Suspense>
          <Suspense>
            <CookieBar />
          </Suspense>
          <Popup />
          <MobileMenu />
          <main>
            <CartIcon />

            <Header />
            {children}
            <Footer />
          </main>
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
            })(window, document, 'script', 'cloud.roistat.com', '86cd2ab6047bc5c2f8ea632e1183ac10');`
            }
          </Script>
          <Script async id="metrika-counter" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(86217584, "init", {
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true,
                webvisor:true,
                ecommerce:"dataLayer"
          });
          window.dataLayer = window.dataLayer || [];
          `}
          </Script>
          <Script type="text/javascript" async src="https://app.uiscom.ru/static/cs.min.js?k=79obNG5YrzIplUgKXZYSiPbK7agWm7Dk"></Script>
          <Agentation />
        </body>
      </ReduxProvider>
    </html>
  );
}

