import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const storedToken = api.getToken();
    if (!storedToken) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setToken(storedToken);
    api
      .get("/me/", storedToken)
      .then((res) => {
        if (!cancelled) setUser(res);
      })
      .catch(() => {
        api.removeToken();
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (userData) => {
    const nextUser = userData?.data || userData || null;
    setUser(nextUser);
    if (userData?.access_token) {
      setToken(userData.access_token);
      api.saveToken(userData.access_token);
      api.setCookie("token", userData.access_token, userData.expires_in || 604800);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.removeToken();
    api.removeCookie("token");
    localStorage.removeItem("ktx_current_building_id");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
