import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RouteGuard } from "@/components/rbac/RouteGuard";

const AppLayout = () => (
  <div className="flex h-screen w-full bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <RouteGuard>
          <Outlet />
        </RouteGuard>
      </main>
    </div>
  </div>
);

export default AppLayout;