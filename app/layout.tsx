import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Picture Prompt Creativer",
  description: "中文图片 Prompt 逆向分析和风格迁移工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
