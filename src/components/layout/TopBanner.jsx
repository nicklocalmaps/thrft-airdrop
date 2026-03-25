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
        {/* THRFT official logo SVG */}
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <path d="M28.2533 31.4621C28.2999 31.4621 28.3204 31.5214 28.2833 31.5498C25.3198 33.8234 21.6115 35.1751 17.5875 35.1751C13.5635 35.1751 9.85519 33.8238 6.8917 31.5498C6.85457 31.5214 6.87509 31.4621 6.92166 31.4621H28.2537H28.2533ZM32.8411 26.3487C32.2268 27.416 31.5034 28.4127 30.6869 29.3236C30.656 29.3582 30.6117 29.3777 30.5654 29.3777H4.60988C4.56364 29.3777 4.51934 29.3582 4.4884 29.3236C3.67156 28.4127 2.94852 27.416 2.33426 26.3487C2.30918 26.3054 2.34077 26.251 2.39093 26.251H32.7844C32.8346 26.251 32.8661 26.3054 32.8411 26.3487ZM34.8272 21.0855C34.6181 22.1209 34.3181 23.1234 33.9361 24.0845C33.9162 24.134 33.868 24.1666 33.8146 24.1666H1.36043C1.30702 24.1666 1.25882 24.134 1.23895 24.0845C0.856909 23.1237 0.556944 22.1212 0.347848 21.0855C0.339706 21.0451 0.370647 21.0074 0.41201 21.0074H34.763C34.804 21.0074 34.8353 21.0451 34.8272 21.0855ZM17.4686 0.000392079C27.2365 -0.0640954 35.175 7.83464 35.175 17.5876C35.175 18.0162 35.1597 18.4412 35.1297 18.8623C35.1274 18.8965 35.0988 18.9229 35.0646 18.9229H0.110743C0.076545 18.9229 0.0478839 18.8965 0.045604 18.8623C0.0156401 18.4467 0.000332489 18.0269 6.79435e-06 17.6035C-0.00846126 8.0343 7.89972 0.0639025 17.4686 0.000392079Z" fill="#FF5500"/>
        </svg>
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