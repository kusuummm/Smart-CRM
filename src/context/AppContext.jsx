import { createContext, useContext, useState, useEffect } from 'react';

// Complete translations
const translations = {
  en: {
    // Navigation & Titles
    dashboard: 'Dashboard',
    customers: 'Customers',
    leads: 'Leads',
    followups: 'Follow-ups',
    calls: 'Call History',
    whatsapp: 'WhatsApp',
    emails: 'Emails',
    events: 'Events',
    reports: 'Reports',
    search: 'Search',
    adminPanel: 'Admin Panel',
    settings: 'Settings',
    myAccount: 'My Account',
    telecallerDashboard: 'Member Panel',
    userPanel: 'User Hub',
    userHub: 'User Hub',
    eventUpdates: 'Event Updates',
    messages: 'Messages & Updates',
    emailUpdates: 'Email Updates',
    myContacts: 'My Contacts',
    myCustomers: 'My Contacts',
    myLeads: 'My Leads',

    // Header & Quick Settings
    notifications: 'Notifications',
    unread: 'unread',
    markAllRead: 'Mark all as read',
    viewAll: 'View all',
    quickSettings: 'Quick Settings',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchAccount: 'Switch Account',
    logout: 'Logout',

    // Actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    searchPlaceholder: 'Search...',
    export: 'Export',
    import: 'Import',

    // Status
    noData: 'No data found',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',

    // Auth & Login
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    loginSuccess: 'Welcome back!',
    demoCredentials: 'Demo Credentials:',

    // Roles & Panel
    telecaller: 'Member',

    // Settings
    appearance: 'Appearance',
    language: 'Language',
    themeColor: 'Theme Color',
    theme: 'Theme',
    system: 'System',
    timezone: 'Timezone',
    currentSettings: 'Current Settings',
    resetDefaults: 'Reset to Defaults',
    resetToDefaults: 'Settings reset to defaults',
    settingsSaved: 'Settings saved successfully!',
    configurePreferences: 'Configure your preferences',
    customizeAppearance: 'Customize app colors and theme',
    darkModeActive: 'Dark theme is active',
    lightModeActive: 'Light theme is active',
    chooseColor: 'Choose your preferred accent color',
    chooseLanguage: 'Choose your preferred language',
    enabled: 'enabled',
    settingsExported: 'Settings exported!',
    exportSettings: 'Export Settings',
    data: 'Data',
    needHelp: 'Need Help?',
    helpDesc: 'Get support with your CRM settings',
    viewDocs: 'View Documentation',
    contactSupport: 'Contact Support',

    // Common
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    mobile: 'Mobile',
    company: 'Company',
    city: 'City',
    state: 'State',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    actions: 'Actions',
    remarks: 'Remarks',
    viewDetails: 'View Details',

    // Customers Page
    customerManagement: 'Customer Management',
    manageAllCustomers: 'Manage all your customers in one place',
    addCustomer: 'Add Customer',
    searchCustomers: 'Search customers...',
    editCustomer: 'Edit Customer',
    addNewCustomer: 'Add New Customer',
    customerName: 'Customer Name',
    mobileNumber: 'Mobile Number',
    alternateNumber: 'Alternate Number',
    companyName: 'Company Name',
    leadSource: 'Lead Source',
    interestedProduct: 'Interested Product',
    assignedTelecaller: 'Assigned Member',
    deleteCustomer: 'Delete Customer',
    areYouSureDelete: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    update: 'Update',

    // Fixed-value fields (safe to translate — not user-entered text)
    active: 'Active',
    inactive: 'Inactive',

    // Dashboard
    welcomeBack: "Here's your CRM overview",
    totalCustomers: 'Total Customers',
    totalLeads: 'Total Leads',
    todaysFollowups: "Today's Follow-ups",
    totalCalls: 'Total Calls',
    whatsappSent: 'WhatsApp Sent',
    emailsSent: 'Emails Sent',
    conversionRate: 'Conversion Rate',
    pendingFollowups: 'Pending Follow-ups',
    monthlyOverview: 'Monthly Overview',
    leadDistribution: 'Lead Distribution',
    todayFollowups: "Today's Follow-ups",
    recentCalls: 'Recent Calls',
    conversionTrend: 'Conversion Trend',
    noFollowups: 'No follow-ups today',
    noCalls: 'No call history',
  },
  hi: {
    // Navigation & Titles
    dashboard: 'डैशबोर्ड',
    customers: 'ग्राहक',
    leads: 'लीड्स',
    followups: 'फॉलो-अप',
    calls: 'कॉल इतिहास',
    whatsapp: 'व्हाट्सएप',
    emails: 'ईमेल',
    events: 'इवेंट्स',
    reports: 'रिपोर्ट्स',
    search: 'खोजें',
    adminPanel: 'एडमिन पैनल',
    settings: 'सेटिंग्स',
    myAccount: 'मेरा अकाउंट',
    telecallerDashboard: 'मेंबर पैनल',
    userPanel: 'यूज़र हब',
    userHub: 'यूज़र हब',
    eventUpdates: 'इवेंट अपडेट्स',
    messages: 'संदेश और अपडेट्स',
    emailUpdates: 'ईमेल अपडेट्स',
    myContacts: 'मेरे संपर्क',
    myCustomers: 'मेरे संपर्क',
    myLeads: 'मेरी लीड्स',

    // Header & Quick Settings
    notifications: 'सूचनाएं',
    unread: 'अपठित',
    markAllRead: 'सभी पढ़े हुए चिह्नित करें',
    viewAll: 'सभी देखें',
    quickSettings: 'त्वरित सेटिंग्स',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    switchAccount: 'अकाउंट बदलें',
    logout: 'लॉगआउट',

    // Actions
    save: 'सेव करें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    add: 'जोड़ें',
    searchPlaceholder: 'खोजें...',
    export: 'निर्यात करें',
    import: 'आयात करें',

    // Status
    noData: 'कोई डेटा नहीं मिला',
    loading: 'लोड हो रहा है...',
    success: 'सफल',
    error: 'त्रुटि',

    // Auth & Login
    password: 'पासवर्ड',
    signIn: 'साइन इन',
    signingIn: 'साइन इन हो रहा है...',
    loginSuccess: 'स्वागत है!',
    demoCredentials: 'डेमो क्रेडेंशियल:',

    // Roles & Panel
    telecaller: 'मेंबर',

    // Settings
    appearance: 'दिखावट',
    language: 'भाषा',
    themeColor: 'थीम रंग',
    theme: 'थीम',
    system: 'सिस्टम',
    timezone: 'समय क्षेत्र',
    currentSettings: 'वर्तमान सेटिंग्स',
    resetDefaults: 'डिफ़ॉल्ट पर रीसेट करें',
    resetToDefaults: 'सेटिंग्स डिफ़ॉल्ट पर रीसेट की गईं',
    settingsSaved: 'सेटिंग्स सफलतापूर्वक सहेजी गईं!',
    configurePreferences: 'अपनी प्राथमिकताएं कॉन्फ़िगर करें',
    customizeAppearance: 'ऐप के रंग और थीम अनुकूलित करें',
    darkModeActive: 'डार्क थीम सक्रिय है',
    lightModeActive: 'लाइट थीम सक्रिय है',
    chooseColor: 'अपना पसंदीदा रंग चुनें',
    chooseLanguage: 'अपनी पसंदीदा भाषा चुनें',
    enabled: 'सक्षम',
    settingsExported: 'सेटिंग्स निर्यात की गईं!',
    exportSettings: 'सेटिंग्स निर्यात करें',
    data: 'डेटा',
    needHelp: 'मदद चाहिए?',
    helpDesc: 'अपनी CRM सेटिंग्स के साथ सहायता प्राप्त करें',
    viewDocs: 'दस्तावेज़ देखें',
    contactSupport: 'सहायता से संपर्क करें',

    // Common
    name: 'नाम',
    email: 'ईमेल',
    phone: 'फोन',
    mobile: 'मोबाइल',
    company: 'कंपनी',
    city: 'शहर',
    state: 'राज्य',
    status: 'स्थिति',
    date: 'तारीख',
    time: 'समय',
    actions: 'कार्रवाई',
    remarks: 'टिप्पणी',
    viewDetails: 'विवरण देखें',

    // Customers Page
    customerManagement: 'ग्राहक प्रबंधन',
    manageAllCustomers: 'अपने सभी ग्राहकों को एक ही स्थान पर प्रबंधित करें',
    addCustomer: 'ग्राहक जोड़ें',
    searchCustomers: 'ग्राहक खोजें...',
    editCustomer: 'ग्राहक संपादित करें',
    addNewCustomer: 'नया ग्राहक जोड़ें',
    customerName: 'ग्राहक का नाम',
    mobileNumber: 'मोबाइल नंबर',
    alternateNumber: 'वैकल्पिक नंबर',
    companyName: 'कंपनी का नाम',
    leadSource: 'लीड सोर्स',
    interestedProduct: 'इंटरेस्टेड प्रोडक्ट',
    assignedTelecaller: 'असाइन मेंबर',
    deleteCustomer: 'ग्राहक हटाएं',
    areYouSureDelete: 'क्या आप "{name}" को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।',
    update: 'अपडेट करें',

    // Fixed-value fields (safe to translate — not user-entered text)
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',

    // Dashboard
    welcomeBack: 'आपके सीआरएम का अवलोकन',
    totalCustomers: 'कुल ग्राहक',
    totalLeads: 'कुल लीड्स',
    todaysFollowups: 'आज के फॉलो-अप',
    totalCalls: 'कुल कॉल्स',
    whatsappSent: 'व्हाट्सएप भेजे गए',
    emailsSent: 'ईमेल भेजे गए',
    conversionRate: 'रूपांतरण दर',
    pendingFollowups: 'लंबित फॉलो-अप',
    monthlyOverview: 'मासिक अवलोकन',
    leadDistribution: 'लीड वितरण',
    todayFollowups: 'आज के फॉलो-अप',
    recentCalls: 'हाल की कॉल्स',
    conversionTrend: 'रूपांतरण प्रवृत्ति',
    noFollowups: 'आज कोई फॉलो-अप नहीं',
    noCalls: 'कोई कॉल इतिहास नहीं',
  },
};

const AppContext = createContext();

export function AppProvider({ children }) {
  // Dark mode state - initialized synchronously with DOM and localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      const isDark = saved ? JSON.parse(saved) : false;
      if (typeof document !== 'undefined') {
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return isDark;
    } catch {
      return false;
    }
  });

  // Language is strictly English across the system
  const language = 'en';

  // Theme color state
  const [themeColor, setThemeColor] = useState(() => {
    try {
      const saved = localStorage.getItem('themeColor');
      if (!saved || saved === 'purple') {
        localStorage.setItem('themeColor', 'blue');
        return 'blue';
      }
      return saved;
    } catch {
      return 'blue';
    }
  });

  // Timezone state
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem('timezone');
    return saved || 'Asia/Kolkata';
  });

  // Clean up any legacy language setting in localStorage
  useEffect(() => {
    localStorage.removeItem('language');
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Helper to convert hex to RGB triplets for CSS opacity functions
  const hexToRgb = (hex) => {
    if (!hex) return '31, 52, 108';
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return `${r}, ${g}, ${b}`;
    }
    const num = parseInt(clean, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  };

  // Apply theme color
  useEffect(() => {
    const colors = {
      blue: {
        50: '#f0f4fa',
        100: '#e2ebf6',
        200: '#c7d7ed',
        300: '#9fb9df',
        400: '#658fca',
        500: '#2b498a',
        600: '#1f346c',
        700: '#182955',
        800: '#121f42',
        900: '#0c142c',
        950: '#080d1e',
      },
      slate: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
      },
      green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
        800: '#065f46',
        900: '#064e3b',
        950: '#022c22',
      },
      red: {
        50: '#fff1f2',
        100: '#ffe4e6',
        200: '#fecdd3',
        300: '#fda4af',
        400: '#fb7185',
        500: '#f43f5e',
        600: '#e11d48',
        700: '#be123c',
        800: '#9f1239',
        900: '#881337',
        950: '#4c0519',
      },
      orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
        950: '#451a03',
      },
      indigo: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
        950: '#1e1b4b',
      },
      cyan: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63',
        950: '#083344',
      },
      violet: {
        50: '#f5f3ff',
        100: '#ede9fe',
        200: '#ddd6fe',
        300: '#c4b5fd',
        400: '#a78bfa',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
        800: '#5b21b6',
        900: '#4c1d95',
        950: '#2e1065',
      },
    };
    const activeColor = themeColor === 'purple' ? 'blue' : themeColor;
    const c = colors[activeColor] || colors.blue;
    Object.entries(c).forEach(([shade, hex]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, hex);
      document.documentElement.style.setProperty(`--color-primary-${shade}-rgb`, hexToRgb(hex));
    });
    // System-wide root accent variables for all controls, buttons & toggles
    document.documentElement.style.setProperty('--color-primary', c[500]);
    document.documentElement.style.setProperty('--color-primary-rgb', hexToRgb(c[500]));
    document.documentElement.style.setProperty('--color-primary-500', c[500]);
    document.documentElement.style.setProperty('--color-primary-600', c[600]);
    document.documentElement.style.setProperty('--color-primary-500-rgb', hexToRgb(c[500]));
    document.documentElement.style.setProperty('--color-primary-600-rgb', hexToRgb(c[600]));
    document.documentElement.style.setProperty('--color-accent', c[500]);
    document.documentElement.style.setProperty('--color-accent-rgb', hexToRgb(c[500]));
    document.documentElement.style.setProperty('accent-color', c[500]);
    document.documentElement.setAttribute('data-theme', activeColor);
    try {
      localStorage.setItem('themeColor', activeColor);
    } catch {}
  }, [themeColor]);

  // Persist timezone
  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  // Translation function - translates a key to English
  const t = (key, params) => {
    let value = translations.en[key];
    if (value && params && typeof params === 'object') {
      Object.entries(params).forEach(([pKey, pVal]) => {
        value = value.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal ?? '');
      });
    }
    return value || key;
  };

  const tValue = (value) => t(value);

  // Toggle dark mode with instant zero-lag DOM class application
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      try {
        localStorage.setItem('darkMode', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Format time based on timezone
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date based on timezone
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AppContext.Provider value={{
      darkMode,
      setDarkMode,
      toggleDarkMode,
      language,
      themeColor,
      setThemeColor,
      timezone,
      setTimezone,
      t,
      tValue,
      formatTime,
      formatDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);