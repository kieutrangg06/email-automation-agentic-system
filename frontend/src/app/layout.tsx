import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Email Operations Intelligence',
  description: 'Email approval and daily inbox intelligence dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}