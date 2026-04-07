import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khởi tạo thông tin người dùng từ token nếu có
    const storedToken = api.getToken();
    if (storedToken) {
      setToken(storedToken);
      // Giả sử có endpoint /me để lấy thông tin user
      // api.get("/me/", storedToken)
      //   .then(res => setUser(res))
      //   .catch(() => {
      //     api.removeToken();
      //     setToken(null);
      //   })
      //   .finally(() => setLoading(false));
      
      // Tạm thời set loading false nếu chưa có /me
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    if (userData?.access_token) {
      setToken(userData.access_token);
      api.saveToken(userData.access_token);
      api.setCookie("token", userData.access_token, userData.expires_in || 3600);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.removeToken();
    api.removeCookie("token");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
