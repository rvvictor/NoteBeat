"use client";

import DashboardLeftPanel from "@/components/DashboardLeftPanel";
import DashboardCenterPanel from "@/components/DashboardCenterPanel";
import DashboardRightPanel from "@/components/DashboardRightPanel";

export default function DashboardPage() {
  return (
    <div className="dashboard-three-panel-layout">
      <DashboardLeftPanel />
      <DashboardCenterPanel />
      <DashboardRightPanel />
    </div>
  );
}
