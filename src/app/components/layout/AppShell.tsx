import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { useIsMobile } from '../ui/use-mobile';
import { Menu } from 'lucide-react';
import { Logo } from '../common/Logo';

const P = {
  bgBase: "#F6F4F0",
  bgSurface: "var(--card, #FFFFFF)",
  border: "var(--border, #E4E0D8)",
  textPrimary: "var(--foreground, #222)",
};

export function AppShell() {
  const [showPalette, setShowPalette] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { 
        e.preventDefault(); 
        setShowPalette(v => !v); 
      }
      if (e.key === "Escape") { 
        setShowPalette(false); 
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPalette]);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:P.bgBase, fontFamily:"Inter, Noto Sans Kannada, Noto Sans Devanagari, sans-serif" }}>
      {/* Desktop static sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Mobile slide-over sidebar drawer */}
      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div 
            onClick={() => setSidebarOpen(false)} 
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} 
          />
          <div style={{ position: "relative", zIndex: 51, width: 220, height: "100%", background: "var(--secondary, #F6F4F0)", boxShadow: "4px 0 20px rgba(0,0,0,0.18)" }}>
            <AppSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth: 0 }}>
        {isMobile && (
          <div style={{ height: 48, background: P.bgSurface, borderBottom: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", flexShrink: 0 }}>
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: P.textPrimary, padding: 4 }}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Logo size={24} />
              <span style={{ fontFamily: "DM Serif Display, serif", fontSize: 16, color: P.textPrimary }}>Asoka HMS</span>
            </div>
            <div style={{ width: 30 }} />
          </div>
        )}
        <TopBar onOpenPalette={() => setShowPalette(true)} />
        <main style={{ flex:1, overflowY:"auto", padding: isMobile ? 12 : 24 }}>
          <div style={{ maxWidth:1120, margin:"0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </div>
  );
}
