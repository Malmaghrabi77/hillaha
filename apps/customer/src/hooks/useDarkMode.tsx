import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useContext, createContext } from 'react';

/**
 * ✅ Dark Mode Support Hook
 * إدارة الوضع المظلم مع حفظ التفضيلات محلياً
 */

export interface DarkModeColors {
  // Background
  bg: string;
  surface: string;
  surfaceSecondary: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // UI Colors
  primary: string;
  primarySoft: string;
  pink: string;
  pinkSoft: string;
  border: string;
  deepPurple: string;

  // Status
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;

  // Additional utility colors
  overlay: string;
  overlayLight: string;
  shadow: string;
  lightBg1: string;  // #FFF7ED (rating bg)
  lightBg2: string;  // #F9FAFB (info bg)
  lightBg3: string;  // #F3F4F6 (secondary bg)
  ratingBg: string;
  ratingText: string;
  ratingDark: string;
}

const LIGHT_COLORS: DarkModeColors = {
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  surfaceSecondary: "#F5F3FF",

  text: "#1F1B2E",
  textSecondary: "#4B5563",
  textMuted: "#6B6480",

  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",
  border: "#E7E3FF",
  deepPurple: "#6D28D9",

  success: "#34D399",
  warning: "#F59E0B",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",

  overlay: "rgba(0,0,0,0.5)",
  overlayLight: "rgba(0,0,0,0.22)",
  shadow: "#000000",
  lightBg1: "#FFF7ED",  // rating bg
  lightBg2: "#F9FAFB",  // info bg
  lightBg3: "#F3F4F6",  // secondary bg
  ratingBg: "#FEF3C7",
  ratingText: "#F59E0B",
  ratingDark: "#92400E",
};

const DARK_COLORS: DarkModeColors = {
  bg: "#0F0E1F",
  surface: "#1A1729",
  surfaceSecondary: "#2A2540",

  text: "#FFFFFF",
  textSecondary: "#E0D9F0",
  textMuted: "#B8B0CC",

  primary: "#C4B5FD",
  primarySoft: "#3730A3",
  pink: "#EC4899",
  pinkSoft: "#831843",
  border: "#2D2245",
  deepPurple: "#7C3AED",

  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  dangerSoft: "#7F1D1D",

  overlay: "rgba(0,0,0,0.8)",
  overlayLight: "rgba(0,0,0,0.5)",
  shadow: "#000000",
  lightBg1: "#3D2817",    // darkened rating bg
  lightBg2: "#2D2D2D",    // darkened info bg
  lightBg3: "#383838",    // darkened secondary bg
  ratingBg: "#713F12",
  ratingText: "#FBBF24",
  ratingDark: "#FCD34D",
};

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  colors: DarkModeColors;
}

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};

export const useDarkModeHook = () => {
  const systemDarkMode = useColorScheme() === 'dark';
  const [userPreference, setUserPreference] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDarkModeSetting();
  }, []);

  // Follow system changes when user has no manual preference
  useEffect(() => {
    if (loaded && userPreference === null) {
      // No saved preference — follow system
    }
  }, [systemDarkMode, loaded, userPreference]);

  const isDarkMode = userPreference !== null ? userPreference : systemDarkMode;

  const loadDarkModeSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('darkMode');
      if (saved !== null) {
        setUserPreference(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading dark mode setting:", error);
    } finally {
      setLoaded(true);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newValue = !isDarkMode;
      setUserPreference(newValue);
      await AsyncStorage.setItem('darkMode', JSON.stringify(newValue));
    } catch (error) {
      console.error("Error saving dark mode setting:", error);
    }
  };

  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return { isDarkMode, toggleDarkMode, colors };
};

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkMode = useDarkModeHook();

  return (
    <DarkModeContext.Provider value={darkMode}>
      {children}
    </DarkModeContext.Provider>
  );
};
