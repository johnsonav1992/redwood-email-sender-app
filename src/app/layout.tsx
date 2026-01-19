import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto'
});

export const metadata: Metadata = {
  title: 'Email Campaign Sender',
  description: 'Email campaign sender for Redwood Financial'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
