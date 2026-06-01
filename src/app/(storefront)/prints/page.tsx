import React from "react";
import { Metadata } from "next";

// audit W-SEO-05 — index-страница /prints пустая (`<></>`). До тех пор пока
// её не заполнят контентом — помечаем noindex и убираем из sitemap.
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

const Page: React.FC = () => {
    return <></>;
};

export default Page;
