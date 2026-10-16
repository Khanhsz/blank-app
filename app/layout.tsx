import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'TripMate — plan a trip worth taking',
  description: 'AI travel itineraries, interactive maps, and simple trip budgeting.'
};
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}