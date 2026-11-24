import type { ReactNode } from 'react';
import './global.css';

// The <html>/<body> tags live in app/[lang]/layout.tsx so each page carries
// the correct lang attribute. This root layout only loads global styles.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
