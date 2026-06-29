import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeStorage } from '../utils/storage';

type Theme = 'midnight' | 'dark-grey';

export interface ThemeTokens {
  colors: {
    primary: string;
    background: string;
    surface1: string;
    surface2: string;
    textPrimary: string;
    textSecondary: string;
    borderSubtle: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  rounded: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

const midnightTokens: ThemeTokens = {
  colors: {
    primary: "#ff5a36",
    background: "#0c0c0e",
    surface1: "#18181b",
    surface2: "#27272a",
    textPrimary: "#f8fafc",
    textSecondary: "#a1a1aa",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  rounded: {
    sm: "4px",
    md: "8px",
    lg: "16px",
    full: "9999px",
  },
};

const darkGreyTokens: ThemeTokens = {
  colors: {
    primary: "#ff5a36",
    background: "#121212",
    surface1: "#1e1e1e",
    surface2: "#2d2d2d",
    textPrimary: "#ffffff",
    textSecondary: "#b0b0b0",
    borderSubtle: "rgba(255, 255, 255, 0.06)",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  rounded: {
    sm: "4px",
    md: "8px",
    lg: "16px",
    full: "9999px",
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'midnight',
  toggleTheme: () => {},
  tokens: midnightTokens,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = safeStorage.getItem('app-theme') as Theme;
    return savedTheme === 'dark-grey' ? 'dark-grey' : 'midnight';
  });

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'midnight' ? 'dark-grey' : 'midnight';
      safeStorage.setItem('app-theme', newTheme);
      return newTheme;
    });
  }, []);

  const tokens = theme === 'dark-grey' ? darkGreyTokens : midnightTokens;

  useEffect(() => {
    const root = document.documentElement;
    
    // Inject Theme Color Palette variables
    root.style.setProperty('--color-brand-primary', tokens.colors.primary);
    root.style.setProperty('--color-bg-base', tokens.colors.background);
    root.style.setProperty('--color-surface-1', tokens.colors.surface1);
    root.style.setProperty('--color-surface-2', tokens.colors.surface2);
    root.style.setProperty('--color-text-primary', tokens.colors.textPrimary);
    root.style.setProperty('--color-text-secondary', tokens.colors.textSecondary);
    root.style.setProperty('--color-border-subtle', tokens.colors.borderSubtle);

    // Inject Spacing variables
    root.style.setProperty('--spacing-xs', tokens.spacing.xs);
    root.style.setProperty('--spacing-sm', tokens.spacing.sm);
    root.style.setProperty('--spacing-md', tokens.spacing.md);
    root.style.setProperty('--spacing-lg', tokens.spacing.lg);
    root.style.setProperty('--spacing-xl', tokens.spacing.xl);

    // Inject Border Radius variables
    root.style.setProperty('--rounded-sm', tokens.rounded.sm);
    root.style.setProperty('--rounded-md', tokens.rounded.md);
    root.style.setProperty('--rounded-lg', tokens.rounded.lg);
    root.style.setProperty('--rounded-full', tokens.rounded.full);

    if (theme === 'dark-grey') {
      root.classList.add('theme-dark-grey');
      root.classList.remove('theme-midnight');
    } else {
      root.classList.add('theme-midnight');
      root.classList.remove('theme-dark-grey');
    }
  }, [theme, tokens]);

  const value = React.useMemo(() => ({ theme, toggleTheme, tokens }), [theme, toggleTheme, tokens]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
