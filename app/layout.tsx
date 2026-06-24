import React from 'react';

// Export the themeColor constant with the brand's primary accent color
export const themeColor = '#d9183b';

// Export metadata containing the themeColor, Open Graph, and Twitter Card properties
export const metadata = {
  themeColor: '#d9183b',
  title: 'Aisles - The Future of Video Commerce',
  description: 'Discover and shop products through immersive video experiences. Connect with creators and brands in real-time.',
  openGraph: {
    title: 'Aisles - The Future of Video Commerce',
    description: 'Discover and shop products through immersive video experiences. Connect with creators and brands in real-time.',
    url: 'https://aisles.platform',
    siteName: 'Aisles',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aisles - The Future of Video Commerce',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aisles - The Future of Video Commerce',
    description: 'Discover and shop products through immersive video experiences. Connect with creators and brands in real-time.',
    images: ['/og-image.png'],
  },
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans antialiased">
      {children}
    </div>
  );
}
