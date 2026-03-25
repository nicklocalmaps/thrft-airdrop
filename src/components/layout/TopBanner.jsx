import React from "react";
import { Menu, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TopBanner({ onMenuClick }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-border flex items-center px-4 lg:px-6 shadow-sm">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden mr-3 text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Logo + brand */}
      <div className="flex items-center gap-3">
        {/* THRFT icon mark */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs tracking-tighter">T</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-black text-lg tracking-tight text-foreground">THRFT</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest -mt-0.5">Airdrop Campaign</span>
        </div>
      </div>

      {/* Presale badge + link */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary">Presale Live</span>
        </div>
        <a
          href="https://thrft.app"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          thrft.app
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
}