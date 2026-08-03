import './globals.css';

export const metadata = {
  title: 'Smart Review AI - Manager Dashboard',
  description: 'B2B Manager Dashboard for Saudi F&B Restaurants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        {/* Feuille de style CSS blindée - Ne peut jamais être bloquée */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
