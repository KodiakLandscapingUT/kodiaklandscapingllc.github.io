import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    tasks: {
      title: 'Team tasks',
      signInPrompt: 'Sign in to view work assigned to you.',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signOut: 'Sign out',
      signInRequired: 'Sign in required',
      signInFailed: 'Sign-in failed. Check your email and password.',
      signInWithGoogle: 'Sign in with Google',
      googleSignInFailed: 'Google sign-in failed. Try again or use your email and password.',
      or: 'or',
      firebaseMissing: 'Firebase staff access is not configured.',
      memberSubtitle: 'Tasks assigned to {{name}}',
      managerSubtitle: 'Assign and track team work',
      todo: 'To do',
      inProgress: 'In progress',
      completed: 'Completed',
      status: 'Status',
      due: 'Due {{date}}',
      noTasks: 'No tasks',
      updateFailed: 'Could not update task',
    },
  },
  es: {
    tasks: {
      title: 'Tareas del equipo',
      signInPrompt: 'Inicia sesión para ver el trabajo que tienes asignado.',
      email: 'Correo electrónico',
      password: 'Contraseña',
      signIn: 'Iniciar sesión',
      signOut: 'Cerrar sesión',
      signInRequired: 'Debes iniciar sesión',
      signInFailed: 'No se pudo iniciar sesión. Verifica tu correo y contraseña.',
      signInWithGoogle: 'Iniciar sesión con Google',
      googleSignInFailed: 'No se pudo iniciar sesión con Google. Inténtalo de nuevo o usa tu correo y contraseña.',
      or: 'o',
      firebaseMissing: 'El acceso del personal con Firebase no está configurado.',
      memberSubtitle: 'Tareas asignadas a {{name}}',
      managerSubtitle: 'Asigna y supervisa el trabajo del equipo',
      todo: 'Por hacer',
      inProgress: 'En progreso',
      completed: 'Completadas',
      status: 'Estado',
      due: 'Vence {{date}}',
      noTasks: 'No hay tareas',
      updateFailed: 'No se pudo actualizar la tarea',
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'tasks',
  interpolation: { escapeValue: false },
});

export default i18n;