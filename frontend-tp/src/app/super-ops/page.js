"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { ShoppingBag, Users, BarChart3, Shield } from "lucide-react";
import { getSuperOpsHomeRoute } from "@/lib/superOps";

const divisions = [
  {
    id: "sales",
    title: "Sales",
    description: "Dashboard, orders, produk, customers, dan tim penjualan.",
    href: getSuperOpsHomeRoute("sales"),
    icon: ShoppingBag,
  },
  {
    id: "hr",
    title: "Human Resources",
    description: "Dashboard HR, karyawan, absensi, dan cuti.",
    href: getSuperOpsHomeRoute("hr"),
    icon: Users,
  },
  {
    id: "finance",
    title: "Finance",
    description: "Dashboard keuangan dan transaksi.",
    href: getSuperOpsHomeRoute("finance"),
    icon: BarChart3,
  },
];

export default function SuperOpsHubPage() {
  return (
    <Layout title="Super OPS — Pusat kontrol">
      <div className="super-ops-hub">
        <header className="super-ops-hub__intro">
          <div className="super-ops-hub__badge">
            <Shield size={18} aria-hidden />
            <span>Super OPS</span>
          </div>
          <h1 className="super-ops-hub__title">Pusat kontrol multi-divisi</h1>
          <p className="super-ops-hub__subtitle">
            Pilih divisi di bawah atau gunakan tab <strong>Pusat</strong>,{" "}
            <strong>Sales</strong>, <strong>HR</strong>, <strong>Finance</strong> di navbar.
          </p>
        </header>

        <ul className="super-ops-hub__grid">
          {divisions.map(({ id, title, description, href, icon: Icon }) => (
            <li key={id}>
              <Link href={href} className="super-ops-hub__card">
                <span className="super-ops-hub__card-icon" aria-hidden>
                  <Icon size={26} strokeWidth={1.75} />
                </span>
                <span className="super-ops-hub__card-title">{title}</span>
                <span className="super-ops-hub__card-desc">{description}</span>
                <span className="super-ops-hub__card-cta">Buka divisi →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
