import { useEffect, useState } from 'react';

export function usePrivacyMode() {
  const [isDecoyMode, setIsDecoyMode] = useState(() => {
    // Check localStorage for privacy mode setting
    const stored = localStorage.getItem('privacy_mode');
    return stored === 'true';
  });

  useEffect(() => {
    let ctrlPressCount = 0;
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo detectar Control (o Command en Mac)
      if (e.key === 'Control' || e.metaKey) {
        ctrlPressCount++;

        // Al tercer press, toggle decoy mode
        if (ctrlPressCount === 3) {
          setIsDecoyMode((prev) => !prev);
          ctrlPressCount = 0;
        }

        // Reset counter después de 1s sin presionar
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          ctrlPressCount = 0;
        }, 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, []);

  // Persist privacy mode preference
  useEffect(() => {
    localStorage.setItem('privacy_mode', isDecoyMode.toString());
  }, [isDecoyMode]);

  return { isDecoyMode, setIsDecoyMode };
}
