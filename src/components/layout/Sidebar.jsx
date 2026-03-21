import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Trophy,
  Activity,
  User,
  Tag,
  Settings,
  Megaphone,
  BarChart2,
  ClipboardList,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const userNav = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "My Activity", path: "/activity", icon: Activity },
  { label: "Profile", path: "/profile", icon: User },
];

const adminNav = [
  { label: "Campaigns", path: "/campaigns", icon: Megaphone },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Manual Entry", path: "/admin/activity", icon: ClipboardList },
  { label: "Tracked Tags", path: "/tags", icon: Tag },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (u?.role === "admin") setIsAdmin(true);
    });
  }, []);

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        onClick={() => onToggle && isOpen && onToggle()}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-4 gap-1">
      <div className="flex items-center justify-between mb-6 px-2">
        <span className="text-sm font-bold tracking-tight text-foreground">THRFT Airdrop</span>
        <button
          onClick={onToggle}
          className="lg:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {userNav.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
      </nav>

      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-1">
            Admin
          </p>
          <nav className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar z-40">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onToggle}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-border">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}