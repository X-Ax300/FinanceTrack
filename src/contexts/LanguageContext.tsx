import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'ft-language';

const translations: Record<Language, Record<string, string>> = {
  en: {},
  es: {
    Account: 'Cuenta',
    Calendar: 'Calendario',
    Cards: 'Tarjetas',
    'Change Password': 'Cambiar contrasena',
    'Choose your preferred appearance': 'Elige tu apariencia preferida',
    Currency: 'Moneda',
    Dashboard: 'Panel',
    'Dark Mode': 'Modo oscuro',
    'Display currency for amounts': 'Moneda para mostrar los montos',
    'Display Name': 'Nombre visible',
    Email: 'Correo',
    English: 'Ingles',
    Expenses: 'Gastos',
    Friends: 'Amigos',
    Goals: 'Metas',
    Language: 'Idioma',
    'Light Mode': 'Modo claro',
    'Manage your account and preferences': 'Administra tu cuenta y preferencias',
    'Min 6 characters': 'Minimo 6 caracteres',
    'New Password': 'Nueva contrasena',
    'No name set': 'Sin nombre',
    Password: 'Contrasena',
    Preferences: 'Preferencias',
    Profile: 'Perfil',
    Reports: 'Reportes',
    Salary: 'Ingresos',
    Security: 'Seguridad',
    Settings: 'Configuracion',
    'Sign Out': 'Cerrar sesion',
    Spanish: 'Espanol',
    Statistics: 'Estadisticas',
    Theme: 'Tema',
    User: 'Usuario',
    'Your name': 'Tu nombre',
    'Current Password': 'Contrasena actual',
    'Save Profile': 'Guardar perfil',
    'Profile updated successfully.': 'Perfil actualizado correctamente.',
    'Failed to update profile.': 'No se pudo actualizar el perfil.',
    'New password must be at least 6 characters.': 'La nueva contrasena debe tener al menos 6 caracteres.',
    'Password changed successfully.': 'Contrasena actualizada correctamente.',
    'Current password is incorrect.': 'La contrasena actual es incorrecta.',
    'Choose your preferred language': 'Elige tu idioma preferido',
    'Welcome back': 'Bienvenido de nuevo',
    'Sign in to your account': 'Inicia sesion en tu cuenta',
    'Invalid email or password. Please try again.': 'Correo o contrasena invalidos. Intenta de nuevo.',
    'Failed to sign in with Google. Please try again.': 'No se pudo iniciar sesion con Google. Intenta de nuevo.',
    'Sign in': 'Iniciar sesion',
    'Sign in with Google': 'Iniciar con Google',
    "Don't have an account?": 'No tienes una cuenta?',
    'Create one': 'Crea una',
    'Create account': 'Crear cuenta',
    'Start tracking your finances': 'Empieza a controlar tus finanzas',
    'Full Name': 'Nombre completo',
    'Already have an account?': 'Ya tienes una cuenta?',
    'Sign in here': 'Inicia sesion aqui',
    'Failed to create account. Please try again.': 'No se pudo crear la cuenta. Intenta de nuevo.',
    'Failed to sign up with Google. Please try again.': 'No se pudo registrarse con Google. Intenta de nuevo.',
    'Forgot password?': 'Olvidaste tu contrasena?',
    'Or continue with': 'O continua con',
    'Or sign up with': 'O registrate con',
    'Passwords do not match.': 'Las contrasenas no coinciden.',
    'Password must be at least 6 characters.': 'La contrasena debe tener al menos 6 caracteres.',
    'Confirm Password': 'Confirmar contrasena',
    'Create your account': 'Crea tu cuenta',
    'Create Account': 'Crear cuenta',
    'Sign up with Google': 'Registrarse con Google',
    'Signing in...': 'Iniciando sesion...',
    'Signing up...': 'Creando cuenta...',
    'Smart financial control at your fingertips': 'Control financiero inteligente en tus manos',
    'Start your financial journey today': 'Empieza tu camino financiero hoy',
    'This email is already registered.': 'Este correo ya esta registrado.',
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'es' || saved === 'en' ? saved : 'en';
}

export function LanguageProvider({ children }: { readonly children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
  }

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translations[language][key] || key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
