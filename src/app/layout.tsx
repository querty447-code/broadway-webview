import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RNBridgeProvider } from '@/lib/bridge';
import { MobileContainer } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Broadway Mobile',
  description: 'Dynamic Over-The-Air Mobile WebView Pages',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090B10',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <RNBridgeProvider>
          <MobileContainer>{children}</MobileContainer>
        </RNBridgeProvider>
      </body>
    </html>
  );
}
