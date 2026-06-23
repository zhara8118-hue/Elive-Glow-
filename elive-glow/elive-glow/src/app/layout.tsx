import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elive Glow – Salon Management',
  description: 'Multi-branch salon management dashboard for Elive Glow',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3D1F2F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1C1C2E',
                color: '#FAF7F4',
                borderRadius: '12px',
                border: '1px solid rgba(201,116,138,0.3)',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
