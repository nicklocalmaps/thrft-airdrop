import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Trophy, Activity, Settings, Hash, Menu, X, Calendar, User, BarChart2, PlusCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const userNavItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Leaderboard", path: "/leaderboard", icon: Trophy },
  { label: "My Profile", path: "/profile", icon: User },
  { label: "Activity Feed", path: "/activity", icon: Activity },
];

const adminNavItems = [
  { label: "Campaigns", path: "/campaigns", icon: Calendar },
  { label: "Analytics", path: "/analytics", icon: BarChart2 },
  { label: "Manual Entry", path: "/admin/activity", icon: PlusCircle },
  { label: "Tracked Tags", path: "/tags", icon: Hash },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin"));
  }, []);

  const renderLink = (item) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <item.icon className="w-[18px] h-[18px]" />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">XTracker</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                Engagement Points
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" onClick={onToggle}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {userNavItems.map(renderLink)}

          {isAdmin && (
            <>
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Admin
                </span>
              </div>
              {adminNavItems.map(renderLink)}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">Powered by X.com API</p>
        </div>
      </aside>
    </>
  );
}