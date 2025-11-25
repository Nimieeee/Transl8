import './globals.css';

export const metadata = {
  title: 'TRANSL8 — AI Video Dubbing Studio',
  description: 'Break language barriers with cinema-quality AI dubbing. Professional video translation in minutes.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.classList.add('no-transition');
                setTimeout(() => {
                  document.documentElement.classList.remove('no-transition');
                }, 0);
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
