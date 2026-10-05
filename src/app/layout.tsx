import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "atlas-project-2",
  description: "링크 하나로 친구의 친구의 친구까지 이어가는 펫 키우기",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
