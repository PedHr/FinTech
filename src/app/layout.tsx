import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FinControl", template: "%s · FinControl" },
  description: "Controle financeiro pessoal seguro e objetivo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
