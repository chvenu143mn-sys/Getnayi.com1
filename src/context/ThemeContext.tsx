import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'midnight' | 'dark-grey';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme === 'dark-grey' ? 'dark-grey' : 'midnight';
  });

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'midnight' ? 'dark-grey' : 'midnight';
      localStorage.setItem('app-theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark-grey') {
      document.documentElement.classList.add('theme-dark-grey');
      document.documentElement.classList.remove('theme-midnight');
    } else {
      document.documentElement.classList.add('theme-midnight');
      document.documentElement.classList.remove('theme-dark-grey');
    }
  }, [theme]);

  const value = React.useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
