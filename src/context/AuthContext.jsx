import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, getMeRequest, logoutRequest } from '../api/auth';
import { heartbeatRequest } from '../api/users';
import { clearApiCache } from '../api/client';

const AuthContext = createContext(null);

const isAllowedCrmRole = (role) => {
  const r = (role || '').toLowerCase().trim();
  return r === 'admin' || r === 'owner' || r === 'member' || r === 'telecaller';
};

const loadAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem('crm_accounts') || '[]');
  } catch {
    return [];
  }
};

const saveAccounts = (list) => {
  localStorage.setItem('crm_accounts', JSON.stringify(list));
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isAllowedCrmRole(parsed.role)) {
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [accounts, setAccounts] = useState(loadAccounts);
  const [addingAccount, setAddingAccount] = useState(false);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('crm_token'));

  // On first load, verify token and role
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    getMeRequest()
      .then((data) => {
        if (!isAllowedCrmRole(data.user?.role)) {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          clearApiCache();
          setUser(null);
          return;
        }
        setUser(data.user);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        clearApiCache();
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // Heartbeat to notify server that user is currently active/online
  useEffect(() => {
    if (!user) return;
    const sendPulse = () => {
      if (localStorage.getItem('crm_token')) {
        heartbeatRequest().catch(() => {});
      }
    };
    sendPulse();
    const interval = setInterval(sendPulse, 60000); // Pulse every 60s
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sendPulse();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  const rememberAccount = (userData, token) => {
    const entry = { id: userData.id, name: userData.name, email: userData.email, role: userData.role, avatar: userData.avatar, token };
    const next = [...loadAccounts().filter((a) => a.id !== userData.id), entry];
    saveAccounts(next);
    setAccounts(next);
  };

  const handleAuthSuccess = (data) => {
    localStorage.setItem('crm_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('crm_refresh_token', data.refreshToken);
    }
    localStorage.setItem('crm_user', JSON.stringify(data.user));
    setUser(data.user);
    rememberAccount(data.user, data.token);
    setAddingAccount(false);
  };

  const loginWithSession = (authData) => {
    if (!isAllowedCrmRole(authData.user?.role)) {
      logout();
      return;
    }
    handleAuthSuccess(authData);
  };

  const login = async (email, password) => {
    try {
      const data = await loginRequest(email, password);
      if (!isAllowedCrmRole(data.user?.role)) {
        return {
          success: false,
          message: 'Access denied. Only admin and member accounts are authorized to access the CRM.',
        };
      }
      handleAuthSuccess(data);
      return { success: true, user: data.user };
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to reach the server. Please try again.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Offline fallback
    }
    clearApiCache();
    setUser(null);
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_refresh_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_accounts');
    localStorage.removeItem('smartcrm_contacts');
    localStorage.removeItem('smartcrm_all_calls');
    localStorage.removeItem('smartcrm_all_tasks');
    sessionStorage.clear();
    setAccounts([]);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('crm_user', JSON.stringify(updatedUser));
    rememberAccount(updatedUser, localStorage.getItem('crm_token'));
  };

  const switchAccount = async (accountId) => {
    const account = loadAccounts().find((a) => a.id === accountId);
    if (!account) return { success: false, message: 'Account not found' };

    const previousToken = localStorage.getItem('crm_token');
    const previousUser = localStorage.getItem('crm_user');

    localStorage.setItem('crm_token', account.token);
    clearApiCache();
    try {
      const data = await getMeRequest();
      if (!isAllowedCrmRole(data.user?.role)) {
        throw new Error('Access denied. Role not authorized.');
      }
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setUser(data.user);
      rememberAccount(data.user, account.token);
      return { success: true };
    } catch {
      if (previousToken) localStorage.setItem('crm_token', previousToken);
      else localStorage.removeItem('crm_token');
      if (previousUser) localStorage.setItem('crm_user', previousUser);
      else localStorage.removeItem('crm_user');

      const next = loadAccounts().filter((a) => a.id !== accountId);
      saveAccounts(next);
      setAccounts(next);
      return { success: false, message: 'That session has expired or is unauthorized. Please log in again.' };
    }
  };

  const removeAccount = async (accountId) => {
    if (user && accountId === user.id) {
      await logout();
      return;
    }
    const next = loadAccounts().filter((a) => a.id !== accountId);
    saveAccounts(next);
    setAccounts(next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        login,
        loginWithSession,
        logout,
        updateUser,
        switchAccount,
        removeAccount,
        addingAccount,
        startAddAccount: () => setAddingAccount(true),
        cancelAddAccount: () => setAddingAccount(false),
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
