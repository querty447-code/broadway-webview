import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
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

function headersToObject(headerList: Headers) {
  const incoming: Record<string, string> = {};
  headerList.forEach((value, key) => {
    incoming[key] = value;
  });
  return incoming;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = headersToObject(await headers());

  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <RNBridgeProvider>
          <MobileContainer requestHeaders={requestHeaders}>{children}</MobileContainer>
        </RNBridgeProvider>
      </body>
    </html>
  );
}
