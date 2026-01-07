import { I18n } from 'i18n-js';
import * as SecureStore from 'expo-secure-store';

const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    // Navigation
    home: 'Home',
    jobs: 'Jobs',
    tracking: 'Tracking',
    messages: 'Messages',
    profile: 'Profile',
    notifications: 'Notifications',
    // Jobs
    availableJobs: 'Available Jobs',
    myJobs: 'My Jobs',
    acceptJob: 'Accept Job',
    completeJob: 'Complete Job',
    pickup: 'Pickup',
    delivery: 'Delivery',
    // Documents
    documents: 'Documents',
    uploadDocument: 'Upload Document',
    license: 'Driver License',
    insurance: 'Insurance',
    registration: 'Vehicle Registration',
    proofOfDelivery: 'Proof of Delivery',
    takePhoto: 'Take Photo',
    chooseFromLibrary: 'Choose from Library',
    signature: 'Signature',
    clearSignature: 'Clear',
    // Status
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
    expired: 'Expired',
    // Invoices
    invoices: 'Invoices',
    paid: 'Paid',
    unpaid: 'Unpaid',
    amount: 'Amount',
    dueDate: 'Due Date',
  },
  es: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    retry: 'Reintentar',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    email: 'Correo',
    password: 'Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    home: 'Inicio',
    jobs: 'Trabajos',
    tracking: 'Rastreo',
    messages: 'Mensajes',
    profile: 'Perfil',
    notifications: 'Notificaciones',
    availableJobs: 'Trabajos Disponibles',
    myJobs: 'Mis Trabajos',
    acceptJob: 'Aceptar Trabajo',
    completeJob: 'Completar Trabajo',
    pickup: 'Recogida',
    delivery: 'Entrega',
    documents: 'Documentos',
    uploadDocument: 'Subir Documento',
    license: 'Licencia de Conducir',
    insurance: 'Seguro',
    registration: 'Registro del Vehículo',
    proofOfDelivery: 'Prueba de Entrega',
    takePhoto: 'Tomar Foto',
    chooseFromLibrary: 'Elegir de la Galería',
    signature: 'Firma',
    clearSignature: 'Borrar',
    pending: 'Pendiente',
    verified: 'Verificado',
    rejected: 'Rechazado',
    expired: 'Expirado',
    invoices: 'Facturas',
    paid: 'Pagado',
    unpaid: 'Sin Pagar',
    amount: 'Monto',
    dueDate: 'Fecha de Vencimiento',
  },
  sw: { // Swahili (Kenya)
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    confirm: 'Thibitisha',
    loading: 'Inapakia...',
    error: 'Hitilafu',
    success: 'Imefanikiwa',
    retry: 'Jaribu Tena',
    login: 'Ingia',
    register: 'Jisajili',
    logout: 'Toka',
    email: 'Barua pepe',
    password: 'Nenosiri',
    forgotPassword: 'Umesahau nenosiri?',
    home: 'Nyumbani',
    jobs: 'Kazi',
    tracking: 'Ufuatiliaji',
    messages: 'Ujumbe',
    profile: 'Wasifu',
    notifications: 'Arifa',
    availableJobs: 'Kazi Zinazopatikana',
    myJobs: 'Kazi Zangu',
    acceptJob: 'Kubali Kazi',
    completeJob: 'Maliza Kazi',
    pickup: 'Kuchukua',
    delivery: 'Uwasilishaji',
    documents: 'Nyaraka',
    uploadDocument: 'Pakia Nyaraka',
    license: 'Leseni ya Udereva',
    insurance: 'Bima',
    registration: 'Usajili wa Gari',
    proofOfDelivery: 'Uthibitisho wa Uwasilishaji',
    takePhoto: 'Piga Picha',
    chooseFromLibrary: 'Chagua kutoka Maktaba',
    signature: 'Sahihi',
    clearSignature: 'Futa',
    pending: 'Inasubiri',
    verified: 'Imethibitishwa',
    rejected: 'Imekataliwa',
    expired: 'Imekwisha Muda',
    invoices: 'Ankara',
    paid: 'Imelipwa',
    unpaid: 'Haijalipwa',
    amount: 'Kiasi',
    dueDate: 'Tarehe ya Mwisho',
  },
};

const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.locale = 'en';
i18n.enableFallback = true;

export const t = (key: string) => i18n.t(key);

export const setLocale = async (locale: string) => {
  i18n.locale = locale;
  await SecureStore.setItemAsync('locale', locale);
};

export const getLocale = () => i18n.locale;

export const loadLocale = async () => {
  const saved = await SecureStore.getItemAsync('locale');
  if (saved) i18n.locale = saved;
};

export const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'sw', name: 'Kiswahili' },
];

export default i18n;
