import type { ReactNode } from "react";
import type { Viewport } from "next";
import "./globals.css";

export const metadata = {
  title: "atlas-project-2",
  description: "링크 하나로 친구의 친구의 친구까지 이어가는 펫 키우기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
