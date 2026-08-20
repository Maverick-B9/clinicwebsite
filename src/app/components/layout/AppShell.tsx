import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';

const P = {
  bgBase: "#F6F4F0",
};

export function AppShell() {
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { 
        e.preventDefault(); 
        setShowPalette(v => !v); 
      }
      if (e.key === "Escape") { 
        setShowPalette(false); 
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPalette]);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:P.bgBase, fontFamily:"Inter, Noto Sans Kannada, Noto Sans Devanagari, sans-serif" }}>
      <AppSidebar />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <TopBar onOpenPalette={() => setShowPalette(true)} />
        <main style={{ flex:1, overflowY:"auto", padding:24 }}>
          <div style={{ maxWidth:1120, margin:"0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </div>
  );
}
