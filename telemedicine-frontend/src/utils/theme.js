// theme.js - Utility functions for theme management

// Initialize theme from localStorage or default to light
export const initializeTheme = () => {
    // Get stored theme from localStorage (first from userSettings, fallback to direct theme storage)
    let theme = 'light'; // Default
    
    try {
      // First try to get from userSettings
      const userSettings = localStorage.getItem('userSettings');
      if (userSettings) {
        const parsedSettings = JSON.parse(userSettings);
        if (parsedSettings.appearance && parsedSettings.appearance.theme) {
          theme = parsedSettings.appearance.theme;
        }
      } else {
        // Fallback to direct theme storage
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
          theme = storedTheme;
        }
      }
    } catch (err) {
      console.error('Error reading theme from localStorage:', err);
    }
    
    // Apply the theme immediately
    applyTheme(theme);
    
    return theme;
  };
  
  // Apply theme to document
  export const applyTheme = (theme) => {
    console.log(`Applying theme: ${theme}`);
    const root = document.documentElement;
    
    // Remove any previous theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // If theme is system, check system preference
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    
    // Add the new theme class
    root.classList.add(`theme-${theme}`);
    
    // Update theme color meta tag for mobile browsers
    const metaThemeColor = document.querySelector('meta[name=theme-color]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1F2937' : '#FFFFFF');
    }
    
    // Save theme to localStorage (direct storage)
    localStorage.setItem('theme', theme);
    
    // Apply CSS variables based on theme
    if (theme === 'dark') {
      applyDarkThemeVariables();
    } else {
      applyLightThemeVariables();
    }
    
    // Custom event for theme change
    const event = new CustomEvent('themeChanged', { detail: theme });
    window.dispatchEvent(event);
    
    return theme;
  };
  
  // Apply CSS variables for dark theme
  const applyDarkThemeVariables = () => {
    document.documentElement.style.setProperty('--bg-primary', '#1F2937');
    document.documentElement.style.setProperty('--bg-secondary', '#374151');
    document.documentElement.style.setProperty('--text-primary', '#F9FAFB');
    document.documentElement.style.setProperty('--text-secondary', '#D1D5DB');
    document.documentElement.style.setProperty('--border-color', '#4B5563');
    document.documentElement.style.setProperty('--card-bg', '#374151');
    document.documentElement.style.setProperty('--card-border', '#4B5563');
  };
  
  // Apply CSS variables for light theme
  const applyLightThemeVariables = () => {
    document.documentElement.style.setProperty('--bg-primary', '#FFFFFF');
    document.documentElement.style.setProperty('--bg-secondary', '#F3F4F6');
    document.documentElement.style.setProperty('--text-primary', '#1F2937');
    document.documentElement.style.setProperty('--text-secondary', '#4B5563');
    document.documentElement.style.setProperty('--border-color', '#E5E7EB');
    document.documentElement.style.setProperty('--card-bg', '#FFFFFF');
    document.documentElement.style.setProperty('--card-border', '#E5E7EB');
  };
  
  // Listen for system theme changes
  export const setupThemeListener = () => {
    // Check if theme is system from userSettings or direct storage
    let isSystemTheme = false;
    
    try {
      // First check userSettings
      const userSettings = localStorage.getItem('userSettings');
      if (userSettings) {
        const parsedSettings = JSON.parse(userSettings);
        isSystemTheme = parsedSettings.appearance?.theme === 'system';
      } else {
        // Fallback to direct storage
        isSystemTheme = localStorage.getItem('theme') === 'system';
      }
    } catch (err) {
      console.error('Error checking system theme preference:', err);
    }
    
    // Only set up the listener if using system theme
    if (isSystemTheme) {
      const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Set up the listener for theme changes
      const listener = () => {
        applyTheme('system');
      };
      
      // Use the modern event listener method if available
      if (prefersDarkQuery.addEventListener) {
        prefersDarkQuery.addEventListener('change', listener);
      } else {
        // Fallback for older browsers
        prefersDarkQuery.addListener(listener);
      }
      
      // Return cleanup function
      return () => {
        if (prefersDarkQuery.removeEventListener) {
          prefersDarkQuery.removeEventListener('change', listener);
        } else {
          prefersDarkQuery.removeListener(listener);
        }
      };
    }
    
    // Return empty cleanup if not using system theme
    return () => {};
  };
  
  // Toggle between light and dark themes
  export const toggleTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Apply the new theme
    applyTheme(newTheme);
    
    // Also update userSettings if it exists
    try {
      const userSettings = localStorage.getItem('userSettings');
      if (userSettings) {
        const parsedSettings = JSON.parse(userSettings);
        if (parsedSettings.appearance) {
          parsedSettings.appearance.theme = newTheme;
          localStorage.setItem('userSettings', JSON.stringify(parsedSettings));
        }
      }
    } catch (err) {
      console.error('Error updating userSettings with new theme:', err);
    }
    
    return newTheme;
  };