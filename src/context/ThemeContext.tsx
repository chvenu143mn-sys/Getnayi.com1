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
  const [theme, setTheme] = useState<Theme>('midnight');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    if (savedTheme === 'dark-grey') {
      setTheme('dark-grey');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'midnight' ? 'dark-grey' : 'midnight';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'dark-grey') {
      document.documentElement.classList.add('theme-dark-grey');
      document.documentElement.classList.remove('theme-midnight');
    } else {
      document.documentElement.classList.add('theme-midnight');
      document.documentElement.classList.remove('theme-dark-grey');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
