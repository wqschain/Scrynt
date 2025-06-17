import { Providers } from './providers';
import { Layout } from './components/Layout';
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const manrope = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Scrynt - Modern Web Application',
  description: 'A modern web application built with Next.js and Chakra UI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
