import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UserContextType {
  currentUserId: number | null;
  setCurrentUserId: (userId: number | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserIdState] = useState<number | null>(null);

  const setCurrentUserId = (userId: number | null) => {
    console.log("Setting current user ID:", userId); // Log for debugging
    setCurrentUserIdState(userId);
  };

  return (
    <UserContext.Provider value={{ currentUserId, setCurrentUserId }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};