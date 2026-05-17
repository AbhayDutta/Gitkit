import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitKit 🔮 | AI-Powered Repository Risk Analysis',
  description: 'Analyze GitHub repositories to predict which files are most likely to break using AI-powered risk scoring.',
};

import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// Made with Bob
