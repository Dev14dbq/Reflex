import React, { useEffect, useRef, useState } from "react";
import { BottomNavBar } from "../components/BottomNavBar/BottomNavBar";

// Высота навбара — ты можешь замерить через ref, но пока хардкодим 80px
const NAVBAR_HEIGHT = 80;

export const BottomLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const contentEl = contentRef.current;
      if (!contentEl) return;

      const contentHeight = contentEl.scrollHeight;
      const screenHeight = window.innerHeight;

      const scrollZone = screenHeight - NAVBAR_HEIGHT;

      setIsScrollable(contentHeight > scrollZone);
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  return (
    <div className="relative h-screen w-full bg-neu-bg-primary overflow-hidden">
      <div
        ref={contentRef}
        className={`${
          isScrollable ? "overflow-y-auto" : "overflow-hidden"
        } pb-24 h-full`}
        style={{
          paddingBottom: `${NAVBAR_HEIGHT}px`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ height: `${NAVBAR_HEIGHT}px` }}
      >
        <BottomNavBar />
      </div>
    </div>
  );
};
