import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Enterprise Email Automation Platform',
  description: 'AI Email Triage & Helpdesk System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
