import "../globals.css";
import TopBar from "@/src/components/personnal/topBar";
import Sidebar from "@/src/components/personnal/sidebar";
import BottomBar from "@/src/components/personnal/bottomBar";
import { SocketProvider } from "@/src/components/providers/socketProvider";
import AuthGuard from "@/src/components/providers/authGuard";
import RightBar from "@/src/components/personnal/rightBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <SocketProvider>
      <div className="w-full h-screen overflow-hidden">
        <div className="flex flex-col w-full h-full max-w-7xl mx-auto">
          <div className="absolute top-0 left-0 right-0 xl:left-auto xl:right-auto z-10">
            <TopBar />
          </div>
          <div className="flex flex-row gap-4 h-full w-full pt-17">
            <Sidebar />
            <div className="xl:max-w-2xl w-full px-3 lg:px-0">{children}</div>
            <RightBar />
          </div>
        </div>
        <BottomBar />
      </div>
    </SocketProvider>
    </AuthGuard>
  );
}
