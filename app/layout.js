import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata = {
  title: "PS Game Deals Radar v1.0.0 — PlayStation Price Tracker",
  description: "Track PlayStation Store prices, get deal alerts, compare regions, and save money on PS5 & PS4 games.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#060610" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
