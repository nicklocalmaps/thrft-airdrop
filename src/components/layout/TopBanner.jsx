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
        <img
          src="https://media.base44.com/images/public/69bdbcef4144ce037aefb6a3/c55f97736_THRFTlogoroundedappiconphoto.png"
          alt="THRFT Logo"
          className="w-9 h-9 rounded-xl shrink-0"
        />
        <div className="flex flex-col leading-none">
          <span className="font-black text-lg tracking-tight text-foreground">THRFT</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest -mt-0.5">Airdrop Campaign</span>
        </div>
      </div>

      {/* Presale badge + link */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-[#4181ED]/10 border border-[#4181ED]/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4181ED] animate-pulse" />
          <span className="text-xs font-semibold text-[#4181ED]">Presale Live</span>
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