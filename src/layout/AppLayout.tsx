import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RouteGuard } from "@/components/rbac/RouteGuard";
import { NotificationPreviewHost } from "@/components/portal/NotificationPreviewHost";

const AppLayout = () => {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <NotificationPreviewHost />
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 animate-fade-in sm:px-6 sm:py-6">
          <RouteGuard>
            <Outlet />
          </RouteGuard>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
