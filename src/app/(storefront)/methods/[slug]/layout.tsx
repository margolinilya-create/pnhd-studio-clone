import methodsData from "@/app/utils/print-methods-data";

export const dynamicParams = false;
export const generateStaticParams = async () => {
    return methodsData.map((item) => ({ slug: item.slug }))
}


export default function Layout ({ children }: { children : React.ReactNode}) {

    return (
        <>
        {children}
        </>
    )
}