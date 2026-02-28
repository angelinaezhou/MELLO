import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

type UserContextType = {
  userName: string | null;
  userImage: string | null;
  connected: boolean;
  setConnected: (val: boolean) => void;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userName: null,
  userImage: null,
  connected: false,
  setConnected: () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchUserProfile = async (token: string) => {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUserName(data.display_name);
    setUserImage(data.images?.[0]?.url ?? null);
  };

  useEffect(() => {
    SecureStore.getItemAsync("access_token").then((token) => {
      if (token) {
        setConnected(true);
        fetchUserProfile(token);
      }
    });
  }, []);

  const logout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("expires_in");
    await SecureStore.deleteItemAsync("stored_at");
    setConnected(false);
    setUserName(null);
    setUserImage(null);
  };

  return (
    <UserContext.Provider value={{ userName, userImage, connected, setConnected, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);