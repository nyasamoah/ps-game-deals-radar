import "./globals.css";

export const metadata = {
  title: "PS Game Deals Radar v1.0.0 — PlayStation Price Tracker",
  description: "Track PlayStation Store prices, get deal alerts, compare regions, and save money on PS5 & PS4 games. Free price history, wishlist sync, and notification alerts.",
  keywords: "playstation deals, ps5 deals, ps4 deals, playstation price tracker, ps store sale, game deals",
  openGraph: {
    title: "PS Game Deals Radar v1.0.0",
    description: "Track PlayStation Store prices and get notified when games hit your target price.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#060610" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
