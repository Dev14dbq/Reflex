import { useEffect, useRef, useState } from "react";

export const useConditionalScroll = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isScrollable, setScrollable] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (!ref.current) return;

      const contentHeight = ref.current.scrollHeight;
      const viewportHeight = window.innerHeight - 80; // учли навбар

      setScrollable(contentHeight > viewportHeight);
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);

    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  return { ref, isScrollable };
};
