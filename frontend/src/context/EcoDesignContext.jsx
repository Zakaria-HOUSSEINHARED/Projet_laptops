import React, { createContext, useContext, useState, useEffect } from "react";

const EcoDesignContext = createContext();

export const EcoDesignProvider = ({ children }) => {
  const [isEcoMode, setIsEcoMode] = useState(() => {
    // Charge l'état depuis localStorage
    const saved = localStorage.getItem("ecoMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Sauvegarde l'état dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem("ecoMode", JSON.stringify(isEcoMode));
  }, [isEcoMode]);

  const toggleEcoMode = () => {
    setIsEcoMode(!isEcoMode);
  };

  return (
    <EcoDesignContext.Provider value={{ isEcoMode, toggleEcoMode }}>
      {children}
    </EcoDesignContext.Provider>
  );
};

export const useEcoDesign = () => {
  const context = useContext(EcoDesignContext);
  if (!context) {
    throw new Error("useEcoDesign doit être utilisé dans EcoDesignProvider");
  }
  return context;
};
