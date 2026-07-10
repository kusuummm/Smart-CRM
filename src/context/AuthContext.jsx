import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, getMeRequest, logoutRequest } from '../api/auth';

const AuthContext = createContext(null);

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
    return saved ? JSON.parse(saved) : null;
  });
  // Every account ever logged into on this browser, so the user can quickly
  // switch between them (like Instagram/Google's account switcher) without
  // re-entering a password each time. Each entry carries its own JWT.
  const [accounts, setAccounts] = useState(loadAccounts);
  // True while the user is on the "add another account" flow - lets Login
  // render even though someone is already signed in, without disturbing
  // their current session unless they actually complete a new login.
  const [addingAccount, setAddingAccount] = useState(false);
  // Starts true whenever a token exists, so the app can show a loading
  // state instead of flashing the Login screen while we verify the token.
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('crm_token'));

  // On first load, if we have a token from a previous session, verify it's
  // still valid (and the account is still active) by asking the backend.
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    getMeRequest()
      .then((data) => {
        setUser(data.user);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
      })
      .catch(() => {
        // Token expired, invalid, or account disabled - clear everything.
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const rememberAccount = (userData, token) => {
    const entry = { id: userData.id, name: userData.name, email: userData.email, role: userData.role, avatar: userData.avatar, token };
    const next = [...loadAccounts().filter((a) => a.id !== userData.id), entry];
    saveAccounts(next);
    setAccounts(next);
  };

  const login = async (email, password) => {
    try {
      const data = await loginRequest(email, password);
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setUser(data.user);
      rememberAccount(data.user, data.token);
      setAddingAccount(false);
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
      // Even if the server call fails (e.g. offline), still log out locally.
    }
    // Logging out ends this remembered session entirely - it should no
    // longer show up as a one-click "switch back to" option.
    if (user) {
      const next = loadAccounts().filter((a) => a.id !== user.id);
      saveAccounts(next);
      setAccounts(next);
    }
    setUser(null);
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
  };

  // Updates the in-memory + persisted user after a successful profile edit,
  // so every component reading `user` from context (Header, Sidebar, etc.)
  // reflects the change immediately without needing a page refresh.
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('crm_user', JSON.stringify(updatedUser));
    rememberAccount(updatedUser, localStorage.getItem('crm_token'));
  };

  // Switches the active session to an already-remembered account without
  // asking for a password again. Validates the stored token is still good
  // first, since it may have expired or been revoked since it was saved.
  const switchAccount = async (accountId) => {
    const account = loadAccounts().find((a) => a.id === accountId);
    if (!account) return { success: false, message: 'Account not found' };

    const previousToken = localStorage.getItem('crm_token');
    const previousUser = localStorage.getItem('crm_user');

    localStorage.setItem('crm_token', account.token);
    try {
      const data = await getMeRequest();
      localStorage.setItem('crm_user', JSON.stringify(data.user));
      setUser(data.user);
      rememberAccount(data.user, account.token);
      return { success: true };
    } catch {
      // That saved session is no longer valid (expired/revoked/disabled) -
      // restore whatever was active before and drop the stale entry.
      if (previousToken) localStorage.setItem('crm_token', previousToken);
      else localStorage.removeItem('crm_token');
      if (previousUser) localStorage.setItem('crm_user', previousUser);
      else localStorage.removeItem('crm_user');

      const next = loadAccounts().filter((a) => a.id !== accountId);
      saveAccounts(next);
      setAccounts(next);
      return { success: false, message: 'That session has expired. Please log in again.' };
    }
  };

  // Forgets a remembered account on this device. If it's the currently
  // active one, this is a full logout (revokes the session server-side
  // too); otherwise it just removes the locally-saved quick-switch entry.
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
    <AuthContext.Provider value={{ user, accounts, login, logout, updateUser, switchAccount, removeAccount, addingAccount, startAddAccount: () => setAddingAccount(true), cancelAddAccount: () => setAddingAccount(false), authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
