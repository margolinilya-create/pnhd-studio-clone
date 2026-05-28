import { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
    title: "Корзина покупок | Оформление заказа",
    description: "Ваши товары в корзине. Проверьте выбранные товары перед оформлением заказа.",
    metadataBase: new URL("https://studio.pnhd.ru"),
};

export default function Page() {
    return <CartClient />;
}