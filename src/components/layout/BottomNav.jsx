import React from "react";
import { BarChart3, Building2, Home, UserRound } from "lucide-react";
import TabButton from "../ui/TabButton";
import InstallFloatingBanner from "./InstallFloatingBanner";

export default function BottomNav({
  tab,
  setTab,
  systemAdmin,
  installApp,
  settings,
}) {
  return (
    <>
      <InstallFloatingBanner installApp={installApp} settings={settings} />
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-4 pb-4 app-safe-bottom app-no-select">
          <div className="grid grid-cols-5 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
            <TabButton
              icon={Building2}
              label="Tòa nhà"
              active={tab === "admin" || tab === "buildings"}
              onClick={() => setTab(systemAdmin ? "admin" : "buildings")}
            />
            <TabButton
              icon={Home}
              label="KTX"
              active={tab === "ktx"}
              onClick={() => setTab("ktx")}
            />
            <TabButton
              icon={BarChart3}
              label="Thống kê"
              active={tab === "stats"}
              onClick={() => setTab("stats")}
            />
            <TabButton
              icon={UserRound}
              label="NLĐ"
              active={tab === "workers"}
              onClick={() => setTab("workers")}
            />
            <TabButton
              icon={UserRound}
              label="Tài khoản"
              active={tab === "about"}
              onClick={() => setTab("about")}
            />
          </div>
        </div>
      </div>
    </>
  );
}
