import { Metadata } from "next";
import CheckoutClient from "./checkoutClient";

export const metadata: Metadata = {
    title: "Оформление заказа | Studio PNHD",
    description: "Оформите заказ на сайте Studio PNHD. Удобный процесс покупки с выбором способов оплаты и доставки",
    metadataBase: new URL("https://studio.pnhd.ru"),
};

export default function Page() {
    return <CheckoutClient />;
}