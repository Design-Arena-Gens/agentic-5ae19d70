import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Computer Repair Management',
  description: 'Track repair jobs, customers, and technicians',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>Computer Repair Management</h1>
          </header>
          <main>{children}</main>
          <footer className="footer">? {new Date().getFullYear()} Repair Manager</footer>
        </div>
      </body>
    </html>
  );
}
