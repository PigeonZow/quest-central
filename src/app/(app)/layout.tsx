import { Navbar } from "@/components/navbar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TooltipProvider>
      <Navbar />
      <main className="pt-14 min-h-screen">{children}</main>
    </TooltipProvider>
  );
}
