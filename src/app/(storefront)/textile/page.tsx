import React from "react";
import { Metadata } from "next";

// audit W-SEO-05 — index-страница /textile пустая (`<></>`). noindex + убрана
// из sitemap до заполнения контентом.
export const metadata: Metadata = {
    robots: { index: false, follow: true },
};

const Page: React.FC = () => {
    return <></>;
};

export default Page;
