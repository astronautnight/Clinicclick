import { Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
export const fontMono = GeistMono;
