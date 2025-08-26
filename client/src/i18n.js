import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        name: 'Construction Tracker',
        manage: 'Manage your construction projects efficiently',
      },
      nav: {
        dashboard: 'Dashboard',
        buildings: 'Buildings',
        workOrders: 'Work Orders',
        workers: 'Workers',
        reminders: 'Reminders',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout',
        notifications: 'Notifications',
      },
      common: {
        or: 'OR',
      },
      auth: {
        login: 'Sign In',
        loggingIn: 'Signing In…',
        register: 'Sign Up',
        createAccount: 'Create an account',
        email: 'Email',
        password: 'Password',
        forgotPassword: 'Forgot your password?',
        noAccount: "Don't have an account?",
        invalidCredentials: 'Invalid email or password',
      },
      validation: {
        required: 'This field is required',
        email: 'Enter a valid email address',
      },
      settings: {
        title: 'Settings',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  keySeparator: '.',
});

export default i18n;
