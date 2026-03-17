import { useEcoDesign } from "./EcoDesignContext";

/**
 * Hook pour obtenir les styles conditionnels selon le mode éco
 */
export const useEcoStyles = () => {
  const { isEcoMode } = useEcoDesign();

  return {
    // Cards/Containers
    card: {
      boxShadow: isEcoMode ? "none" : "0 1px 8px rgba(0,0,0,0.07)",
      border: isEcoMode ? "1px solid #d1d5db" : "none",
      background: isEcoMode ? "#f9fafb" : "white",
    },

    // Badges
    badge: {
      opacity: isEcoMode ? 0.8 : 1,
      fontSize: isEcoMode ? "0.7rem" : "0.75rem",
    },

    // Buttons
    button: {
      transition: isEcoMode ? "none" : "all 0.2s",
      boxShadow: isEcoMode ? "none" : "0 1px 3px rgba(0,0,0,0.1)",
    },

    // Text
    heading: {
      letterSpacing: isEcoMode ? 0 : "normal",
      fontSize: isEcoMode ? "1.5rem" : "1.8rem",
    },

    // General
    container: {
      background: isEcoMode ? "#fafafa" : "transparent",
    },

    // No animation
    animation: isEcoMode ? "none" : "auto",

    // Reduced colors
    saturation: isEcoMode ? 0.7 : 1,
  };
};
