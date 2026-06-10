import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '厨房レイアウト',
  description: '厨房機器レイアウトアプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
