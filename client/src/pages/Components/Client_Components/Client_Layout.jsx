import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Client_Sidebar from "./Client_Sidebar.jsx";
import ClientHeader from "./ClientHeader.jsx";
import ClientAssistant from "../../../components/client/ClientAssistant.jsx";

import { getEnabledClientModules } from "../../../services/operations/client_modules";

function Client_Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moduleContext, setModuleContext] = useState(null);
  const [loadingModules, setLoadingModules] = useState(true);

  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function loadModules() {
      try {
        setLoadingModules(true);
        const data = await getEnabledClientModules();

        if (mounted) {
          setModuleContext(data);
        }
      } catch (err) {
        console.error("Client layout module load error:", err);

        if (mounted) {
          setModuleContext(null);
        }
      } finally {
        if (mounted) {
          setLoadingModules(false);
        }
      }
    }

    loadModules();

    return () => {
      mounted = false;
    };
  }, []);

  const activeSection = useMemo(() => {
    const navSections = moduleContext?.navSections || [];

    return navSections.find((section) =>
      section.items.some((item) => item.clientRoute === location.pathname)
    );
  }, [location.pathname, moduleContext?.navSections]);

  return (
    <div className="admin-shell h-screen w-full overflow-hidden bg-[var(--bg-app)]">
      <Client_Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        modules={moduleContext?.modules || []}
        user={moduleContext?.profile}
        workspace={moduleContext?.workspace}
        loading={loadingModules}
      />

      <div className="flex h-screen min-w-0 flex-col lg:ml-[280px]">
        <ClientHeader
          onMenu={() => setSidebarOpen(true)}
          title={activeSection?.title || "Client Portal"}
          user={moduleContext?.profile}
          workspace={moduleContext?.workspace}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg-app)] px-4 py-4 lg:px-6 lg:py-6">
          <Outlet context={moduleContext} />
        </main>
      </div>

      <ClientAssistant />
    </div>
  );
}

export default Client_Layout;
