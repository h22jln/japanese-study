import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "またね！ | 일본어 복습",
  description: "PDF 학습 자료를 요약하고 단어장으로 만드는 またね！ 일본어 복습 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
