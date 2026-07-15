"use client";

import "@/styles/sales/dashboard-tabs.css";

export default function DashboardTabs({ tabs = [], activeKey, onChange }) {
  return (
    <div className="dashboard-tabs" role="tablist">
      {tabs.map(({ key, label, Icon }) => {
        const tabKey = key ?? label;
        const isActive = tabKey === activeKey;

        return (
          <button
            key={tabKey}
            type="button"
            className={`dashboard-tab ${isActive ? "dashboard-tab--active" : ""}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(tabKey)}
          >
            {Icon ? <Icon size={16} aria-hidden /> : null}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

