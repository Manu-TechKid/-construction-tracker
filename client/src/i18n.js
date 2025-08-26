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
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        back: 'Back',
        loading: 'Loading...',
        error: 'An error occurred',
        success: 'Success',
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
        minLength: 'Must be at least {{count}} characters',
        maxLength: 'Must be at most {{count}} characters',
      },
      settings: {
        title: 'Settings',
        appearance: 'Appearance',
        language: 'Language',
        notifications: 'Notifications',
        emailAlerts: 'Email Alerts',
        timezone: 'Timezone',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        settingsSaved: 'Settings saved successfully',
      },
    },
  },
  es: {
    translation: {
      app: {
        name: 'Seguimiento de Construcción',
        manage: 'Gestione sus proyectos de construcción de manera eficiente',
      },
      nav: {
        dashboard: 'Panel',
        buildings: 'Edificios',
        workOrders: 'Órdenes de Trabajo',
        workers: 'Trabajadores',
        reminders: 'Recordatorios',
        profile: 'Perfil',
        settings: 'Configuración',
        logout: 'Cerrar Sesión',
        notifications: 'Notificaciones',
      },
      common: {
        or: 'O',
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        back: 'Atrás',
        loading: 'Cargando...',
        error: 'Ocurrió un error',
        success: 'Éxito',
      },
      auth: {
        login: 'Iniciar Sesión',
        loggingIn: 'Iniciando sesión...',
        register: 'Registrarse',
        createAccount: 'Crear una cuenta',
        email: 'Correo electrónico',
        password: 'Contraseña',
        forgotPassword: '¿Olvidaste tu contraseña?',
        noAccount: '¿No tienes una cuenta?',
        invalidCredentials: 'Correo o contraseña inválidos',
      },
      validation: {
        required: 'Este campo es obligatorio',
        email: 'Ingrese un correo electrónico válido',
        minLength: 'Debe tener al menos {{count}} caracteres',
        maxLength: 'No debe exceder los {{count}} caracteres',
      },
      settings: {
        title: 'Configuración',
        appearance: 'Apariencia',
        language: 'Idioma',
        notifications: 'Notificaciones',
        emailAlerts: 'Alertas por correo',
        timezone: 'Zona horaria',
        theme: 'Tema',
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema',
        settingsSaved: 'Configuración guardada exitosamente',
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

export const changeLanguage = (lng) => {
  return i18n.changeLanguage(lng);
};

export default i18n;
