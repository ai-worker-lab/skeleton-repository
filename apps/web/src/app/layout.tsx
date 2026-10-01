import type { Metadata } from 'next';
import '@app-skeleton/design-tokens/tokens.css';
import '../styles.css';

export const metadata: Metadata = {
  title: { default: 'app-skeleton', template: '%s | app-skeleton' },
  description: 'app-skeleton',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
