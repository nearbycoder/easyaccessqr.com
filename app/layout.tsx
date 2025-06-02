import type React from 'react';
import '@/app/globals.css';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'EasyAccessQR - Custom QR Codes with Analytics',
  description:
    'Create beautiful, customized QR codes and track their performance with our comprehensive analytics dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <script
        defer
        async
        data-domain="easyaccessqr.com"
        src="https://tic.nrby.xyz/js/script.js"
      ></script>

      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
