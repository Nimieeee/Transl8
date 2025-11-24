import './globals.css';

export const metadata = {
  title: 'TRANSL8 — AI Video Dubbing Studio',
  description: 'Break language barriers with cinema-quality AI dubbing. Professional video translation in minutes.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
