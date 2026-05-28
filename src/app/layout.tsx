import ReduxProvider from "@/redux/redux-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
