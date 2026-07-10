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
    telecallerDashboard: 'My Dashboard',
    myCustomers: 'My Customers',
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

    // Settings
    appearance: 'Appearance',
    language: 'Language',
    themeColor: 'Theme Color',
    theme: 'Theme',
    system: 'System',
    timezone: 'Timezone',
    currentSettings: 'Current Settings',
    resetDefaults: 'Reset to Defaults',
    exportSettings: 'Export Settings',
    data: 'Data',
    needHelp: 'Need Help?',
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
    assignedTelecaller: 'Assigned Telecaller',
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
    telecallerDashboard: 'मेरा डैशबोर्ड',
    myCustomers: 'मेरे ग्राहक',
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

    // Settings
    appearance: 'दिखावट',
    language: 'भाषा',
    themeColor: 'थीम रंग',
    theme: 'थीम',
    system: 'सिस्टम',
    timezone: 'समय क्षेत्र',
    currentSettings: 'वर्तमान सेटिंग्स',
    resetDefaults: 'डिफ़ॉल्ट पर रीसेट करें',
    exportSettings: 'सेटिंग्स निर्यात करें',
    data: 'डेटा',
    needHelp: 'मदद चाहिए?',
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
    assignedTelecaller: 'असाइन टेलीकॉलर',
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
  // Dark mode state - initialized from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Language state
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  // Theme color state
  const [themeColor, setThemeColor] = useState(() => {
    const saved = localStorage.getItem('themeColor');
    return saved || 'blue';
  });

  // Timezone state
  const [timezone, setTimezone] = useState(() => {
    const saved = localStorage.getItem('timezone');
    return saved || 'Asia/Kolkata';
  });

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Apply theme color
  useEffect(() => {
    const colors = {
      blue: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
      red: { 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      green: { 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
      purple: { 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
      orange: { 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
    };
    const c = colors[themeColor] || colors.blue;
    document.documentElement.style.setProperty('--color-primary-500', c[500]);
    document.documentElement.style.setProperty('--color-primary-600', c[600]);
    document.documentElement.style.setProperty('--color-primary-700', c[700]);
    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Persist timezone
  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  // Translation function - translates a key to current language
  const t = (key) => {
    const value = translations[language]?.[key] || translations.en[key];
    if (!value && import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    return value || key;
  };

  // Translate a fixed-value/enum field (e.g. status: 'active' | 'inactive').
  // Use ONLY for values from a known, limited set defined in `translations`.
  // NEVER use this for user-entered data (names, remarks, emails, etc.) —
  // that data should always be displayed exactly as entered, in any language.
  const tValue = (value) => t(value);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // Toggle language (switch between en and hi)
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  // Format time based on timezone
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date based on timezone
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
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
      setLanguage,
      toggleLanguage,
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