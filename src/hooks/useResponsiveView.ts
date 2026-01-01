import { useState, useEffect } from 'react';

/**
 * Hook to detect responsive viewport breakpoints
 *
 * Breakpoints align with Tailwind CSS:
 * - sm: 640px
 * - md: 768px (primary mobile/desktop switch)
 * - lg: 1024px
 * - xl: 1280px
 */
export function useResponsiveView() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 640 && window.innerWidth < 1024;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 640 && width < 1024);
    };

    // Initial check
    handleResize();

    // Listen for changes
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile,
  };
}

export default useResponsiveView;
