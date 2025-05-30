import React, { useState, useEffect } from 'react';
import { toggleTheme } from '../utils/theme';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    // Check current theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    setIsDark(currentTheme === 'dark');
    
    // Add event listener for theme changes
    const handleThemeChange = (e) => {
      setIsDark(e.detail === 'dark');
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);
  
  const handleToggle = () => {
    const newTheme = toggleTheme();
    setIsDark(newTheme === 'dark');
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: newTheme
    }));
  };
  
  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        // Sun icon for light mode
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;