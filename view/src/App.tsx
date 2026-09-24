import { useEffect, useMemo, useState, type ChangeEvent, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getApplication, listApplications, revealApplicationSensitiveField, submitApplication, type ApplicationRecord } from '@/api';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  CssBaseline,
  FormControlLabel,
  MenuItem,
  Paper,
  Radio,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Download,
  FileCheck2, HardHat, Info, LockKeyhole, MapPin,
  RotateCcw, Save, ShieldCheck, Trash2, UserRound, UsersRound,
  FileText, Globe, Eye, LogIn, LogOut, Moon, Sun, ClipboardList, Plus, UserPlus
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Link } from 'wouter';
import { generateProfilePDF, mergePDFs } from '@/lib/pdf';
import { firebaseAuth, signInWithGoogle } from '@/lib/firebase';
const queryClient = new QueryClient();
type ColorMode = 'light' | 'dark';
const COLOR_MODE_KEY = 'kodiak-color-mode';
const ColorModeContext = createContext<{ mode: ColorMode; toggleMode: () => void }>({
  mode: 'light',
  toggleMode: () => {},
});

const createKodiakTheme = (mode: ColorMode) => createTheme({
  palette: {
    mode,
    primary: { main: '#c7342f', dark: '#972621', contrastText: '#fffaf1' },
    secondary: { main: mode === 'dark' ? '#f4efe5' : '#252b39' },
    warning: { main: '#f3bf2f' },
    background: mode === 'dark'
      ? { default: '#151821', paper: '#20242e' }
      : { default: '#f4efe5', paper: '#fffaf1' },
    text: mode === 'dark'
      ? { primary: '#f4efe5', secondary: '#b4b8c1' }
      : { primary: '#191d27', secondary: '#59606e' },
  },
  typography: {
    fontFamily: '"Manrope", sans-serif',
    button: { fontWeight: 800, textTransform: 'none' },
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44, paddingInline: 18 } },
    },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
const DRAFT_KEY = 'kodiak-employment-application-draft';
const SUBMITTED_KEY = 'kodiak-employment-application-submitted';

// --- i18n Context ---
type Lang = 'en' | 'es';
const translations = {
  en: {
    start: 'Start Application',
    resume: 'Continue',
    deleteDraft: 'Delete saved application',
    saved: 'Saved Draft',
    savedDesc: 'You can continue where you left off.',
    secure: 'Your data is securely saved on this device',
    city: 'Ogden, Utah',
    title: 'Work that matters.',
    subtitle: 'Give us an idea of who you are and what you can do. This application takes about 8 minutes.',
    know: 'What you need to know',
    k1: 'Straight to the point',
    k1d: 'We only ask what we need to get to know you and find the best fit.',
    k2: 'No sensitive documents',
    k2d: 'We don’t ask for SSN, passport, or official legal forms in this step.',
    k3: 'A real team',
    k3d: 'We are based in Ogden and build spaces that last.',
    time: 'Estimated time: 8 minutes',
    
    // Steps
    s1: 'Your Info',
    s2: 'Emergency',
    s3: 'Work',
    s4: 'H-2B / Legal',
    s5: 'Review',
    
    // Step 1
    h1: 'Let’s start with you.',
    h1d: 'Tell us how to contact you.',
    first: 'First Name',
    last: 'Last Name',
    phone: 'Phone Number',
    email: 'Email Address',
    street: 'Street Address',
    state: 'State',
    zip: 'ZIP Code',
    cityField: 'City',
    
    // Step 2
    h2: 'If something happens...',
    h2d: 'Choose someone we can contact in case of an emergency at work.',
    cName: 'Full Name',
    cRel: 'Relationship',
    cPhone: 'Phone',
    cDesc: 'We will only use this if there is a work-related emergency.',

    // Step 3
    h3: 'Where do you fit?',
    h3d: 'You don’t have to know the exact title. Pick what matches your skills best.',
    pos: 'Area of Interest',
    posList: [
      { value: 'landscaping', label: 'Landscaping & Maintenance' },
      { value: 'construction', label: 'General Construction' },
      { value: 'irrigation', label: 'Irrigation & Outdoor Systems' },
      { value: 'operator', label: 'Heavy Equipment Operator' },
      { value: 'any', label: 'Open to anything' },
    ],
    startD: 'When could you start?',
    
    // Step 4
    h4: 'H-2B & Legal Requirements',
    h4d: 'Please confirm your work status and basic requirements.',
    h2bq: 'Are you applying as an H-2B Visa Worker?',
    yes: 'Yes',
    no: 'No',
    lift: 'I can lift and move materials up to 50 pounds with or without reasonable accommodations.',
    outdoor: 'I understand the work may be outdoors and require standing, bending, or walking during the day.',
    secureBlock: 'Secure Document Collection',
    secureDesc: 'Your SSN and Passport details will be collected securely by Kodiak in person. Do not enter them here.',
    
    // Step 5
    h5: 'One last look.',
    h5d: 'Review your answers. When you finish, you can download your packet to provide to the Kodiak office.',
    consent: 'I confirm the information is correct and authorize Kodiak to contact me about job opportunities. I understand this application is not an employment offer.',
    
    back: 'Back',
    exit: 'Exit',
    next: 'Next',
    submit: 'Finish & Generate PDF',
    localSave: 'Local draft',
    saving: 'Saving...',
    
    // Success
    done: 'Your application is complete.',
    doneSub: 'Your application was submitted securely. You can also download a copy of your packet.',
    downloadBtn: 'Download Packet (PDF)',
    generateError: 'Failed to generate PDF. Please try again.',
    w4Error: 'Could not fetch the W-4 automatically.',
    w4ErrorLinks: 'Please download the W-4 directly from the IRS:',
    downloadEnW4: 'W-4 (English)',
    downloadEsW4: 'W-4 (Spanish)',
    restart: 'Start another application',

    // Validation
    req: 'Required',
    errName: 'Enter your first name.',
    errLast: 'Enter your last name.',
    errPhone: 'Enter a phone number.',
    errEmail: 'Enter a valid email.',
    errStreet: 'Enter your street address.',
    errCity: 'Enter your city.',
    errState: 'Enter your state.',
    errZip: 'Enter your ZIP code.',
    errCName: 'Enter a contact name.',
    errCRel: 'Enter the relationship.',
    errCPhone: 'Enter a contact phone.',
    errPos: 'Select an area.',
    errStart: 'Select a start date.',
    errH2b: 'Select yes or no.',
    errTerms: 'Please confirm to continue.',
    errConsent: 'You must accept to generate the PDF.',
  },
  es: {
    start: 'Comenzar solicitud',
    resume: 'Continuar',
    deleteDraft: 'Borrar solicitud guardada',
    saved: 'Borrador Guardado',
    savedDesc: 'Puedes continuar donde lo dejaste.',
    secure: 'Tus datos se guardan de forma segura en este dispositivo',
    city: 'Ogden, Utah',
    title: 'Trabajo que se nota.',
    subtitle: 'Danos una idea de quién eres y qué sabes hacer. Esta solicitud toma unos 8 minutos.',
    know: 'Lo que necesitas saber',
    k1: 'Directo al punto',
    k1d: 'Solo preguntamos lo necesario para conocerte y encontrar tu mejor lugar.',
    k2: 'Sin documentos sensibles',
    k2d: 'No pedimos SSN, pasaporte ni formularios legales en esta etapa.',
    k3: 'Un equipo de verdad',
    k3d: 'Estamos en Ogden y construimos espacios que duran.',
    time: 'Tiempo estimado: 8 minutos',
    
    s1: 'Tus datos',
    s2: 'Emergencia',
    s3: 'Trabajo',
    s4: 'H-2B / Legal',
    s5: 'Revisión',
    
    h1: 'Empecemos por ti.',
    h1d: 'Cuéntanos cómo podemos contactarte.',
    first: 'Nombre',
    last: 'Apellido',
    phone: 'Número de Teléfono',
    email: 'Correo Electrónico',
    street: 'Dirección',
    state: 'Estado',
    zip: 'Código Postal',
    cityField: 'Ciudad',
    
    h2: 'Si pasa algo...',
    h2d: 'Elige a alguien que podamos contactar en caso de una emergencia durante el trabajo.',
    cName: 'Nombre completo',
    cRel: 'Relación contigo',
    cPhone: 'Teléfono',
    cDesc: 'Usaremos estos datos solo si ocurre una emergencia relacionada con tu trabajo.',

    h3: '¿Dónde encajas?',
    h3d: 'No tienes que saber el nombre exacto del puesto. Elige lo que más se parezca a lo que sabes hacer.',
    pos: 'Área de interés',
    posList: [
      { value: 'landscaping', label: 'Paisajismo y mantenimiento' },
      { value: 'construction', label: 'Construcción general' },
      { value: 'irrigation', label: 'Riego y sistemas exteriores' },
      { value: 'operator', label: 'Operación de maquinaria' },
      { value: 'any', label: 'Estoy abierto a donde haga falta' },
    ],
    startD: '¿Cuándo podrías comenzar?',
    
    h4: 'H-2B y Requisitos Legales',
    h4d: 'Por favor confirma tu estado de trabajo y requisitos básicos.',
    h2bq: '¿Estás aplicando como trabajador con Visa H-2B?',
    yes: 'Sí',
    no: 'No',
    lift: 'Puedo levantar y mover materiales de hasta 50 libras con o sin ajustes razonables.',
    outdoor: 'Entiendo que el trabajo puede ser al aire libre y requerir estar de pie, agacharse o caminar durante el día.',
    secureBlock: 'Recolección Segura de Documentos',
    secureDesc: 'Tus detalles de SSN y Pasaporte serán recolectados de manera segura por Kodiak en persona. No los ingreses aquí.',
    
    h5: 'Una última mirada.',
    h5d: 'Revisa tus respuestas. Al terminar, podrás descargar tu paquete para entregarlo en la oficina de Kodiak.',
    consent: 'Confirmo que la información es correcta y autorizo a Kodiak a contactarme sobre oportunidades de trabajo. Entiendo que esta solicitud no es una oferta de empleo.',
    
    back: 'Atrás',
    exit: 'Salir',
    next: 'Siguiente',
    submit: 'Terminar y Generar PDF',
    localSave: 'Borrador local',
    saving: 'Guardando...',
    
    done: 'Tu solicitud está completa.',
    doneSub: 'Tu solicitud fue enviada de forma segura. También puedes descargar una copia de tu paquete.',
    downloadBtn: 'Descargar Paquete (PDF)',
    generateError: 'No se pudo generar el PDF. Por favor intenta de nuevo.',
    w4Error: 'No se pudo obtener el W-4 automáticamente.',
    w4ErrorLinks: 'Por favor descarga el W-4 directamente desde el IRS:',
    downloadEnW4: 'W-4 (Inglés)',
    downloadEsW4: 'W-4 (Español)',
    restart: 'Iniciar otra solicitud',

    req: 'Requerido',
    errName: 'Escribe tu nombre.',
    errLast: 'Escribe tu apellido.',
    errPhone: 'Escribe un teléfono.',
    errEmail: 'Escribe un correo válido.',
    errStreet: 'Escribe tu dirección.',
    errCity: 'Escribe tu ciudad.',
    errState: 'Escribe tu estado.',
    errZip: 'Escribe tu código postal.',
    errCName: 'Agrega un contacto.',
    errCRel: 'Indica la relación.',
    errCPhone: 'Agrega un teléfono.',
    errPos: 'Selecciona un área.',
    errStart: 'Selecciona una fecha.',
    errH2b: 'Selecciona sí o no.',
    errTerms: 'Confirma para continuar.',
    errConsent: 'Necesitas aceptar para generar el PDF.',
  }
};

const LangContext = createContext<{ lang: Lang, setLang: (l: Lang) => void, t: typeof translations['en'] }>({
  lang: 'en',
  setLang: () => {},
  t: translations.en
});

// --- Data Types ---
export type ApplicationData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  position: string;
  startDate: string;
  isH2b: boolean | null;
  canLift: boolean;
  understandsWork: boolean;
  consent: boolean;
};

const emptyData: ApplicationData = {
  firstName: '', lastName: '', phone: '', email: '',
  streetAddress: '', city: '', state: '', zip: '',
  emergencyName: '', emergencyRelation: '', emergencyPhone: '',
  position: '', startDate: '',
  isH2b: null, canLift: false, understandsWork: false, consent: false,
};

function hasDraft(data: ApplicationData) {
  return Object.entries(data).some(([, value]) => {
    if (typeof value === 'boolean') return value;
    if (value === null) return false;
    return Boolean(value);
  });
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

// --- Components ---

function Field({ label, name, value, onChange, placeholder, type = 'text', error, required = true }: { label: string; name: keyof ApplicationData; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; error?: string; required?: boolean; }) {
  return (
    <TextField
      id={name}
      name={name}
      label={label}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      error={Boolean(error)}
      helperText={error || ' '}
      slotProps={{ htmlInput: { 'data-testid': `input-${name}` } }}
    />
  );
}

function SelectField({ label, name, value, onChange, options, placeholder, error }: { label: string; name: keyof ApplicationData; value: string; onChange: (event: ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; placeholder: string; error?: string; }) {
  return (
    <TextField
      select
      id={name}
      name={name}
      label={label}
      value={value}
      onChange={(event) => onChange(event as unknown as ChangeEvent<HTMLSelectElement>)}
      required
      error={Boolean(error)}
      helperText={error || ' '}
      slotProps={{ select: { displayEmpty: true }, htmlInput: { 'data-testid': `select-${name}` } }}
    >
      <MenuItem value="" disabled>{placeholder}</MenuItem>
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  );
}

function SectionHeader({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <Box className="animate-slide" sx={{ mb: 4 }}>
      <Typography className="mono-label" sx={{ mb: 1.5, color: 'primary.main' }}>{eyebrow}</Typography>
      <Typography variant="h2" className="font-display" sx={{ fontSize: { xs: '1.875rem', sm: '2.25rem' }, fontWeight: 'bold', letterSpacing: '-0.04em' }}>{title}</Typography>
      <Typography sx={{ mt: 1.5, maxWidth: '36rem', fontSize: '0.875rem', lineHeight: 1.5, color: 'text.secondary' }}>{detail}</Typography>
    </Box>
  );
}

function BrandMark() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }} data-testid="brand-kodiak">
      <Box sx={{ position: 'relative', display: 'flex', height: 44, width: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 2, bgcolor: 'secondary.main', color: 'warning.main' }}>
        <Box component="span" className="font-display" sx={{ position: 'absolute', right: -4, top: -8, fontSize: '3rem', fontWeight: 'bold', lineHeight: 1, opacity: 0.2 }}>K</Box>
        <HardHat style={{ position: 'relative', height: 24, width: 24 }} strokeWidth={2.2} aria-hidden="true" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography className="font-display" sx={{ fontSize: '1.125rem', fontWeight: 'bold', lineHeight: 1, letterSpacing: '-0.03em' }}>KODIAK</Typography>
        <Typography className="mono-label" sx={{ mt: 0.5, fontSize: '0.58rem', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>Landscaping &amp; Construction</Typography>
      </Box>
    </Box>
  );
}

// --- Screens ---

function Welcome({ draft, onStart, onContinue, onDelete }: { draft: ApplicationData; onStart: () => void; onContinue: () => void; onDelete: () => void; }) {
  const { t } = useContext(LangContext);
  const hasSavedDraft = hasDraft(draft);
  return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', display: 'flex', minHeight: 'calc(100dvh - 80px)', width: 1, maxWidth: 'lg', alignItems: 'center', px: { xs: 2.5, sm: 4, lg: 6 }, py: 5 }}>
      <Box sx={{ display: 'grid', width: 1, gap: 6, gridTemplateColumns: { lg: '1.05fr 0.95fr' }, alignItems: { lg: 'center' } }}>
        <Box component="section" className="animate-rise">
          <Box sx={{ mb: 4, display: 'inline-flex', alignItems: 'center', gap: 1, borderRadius: 8, border: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 1.5, py: 1, fontSize: '0.75rem', fontWeight: 'bold', color: 'text.secondary' }}>
            <MapPin size={14} color="#c7342f" aria-hidden="true" />
            {t.city}
          </Box>
          <Typography variant="h1" className="font-display" sx={{ maxWidth: '42rem', fontSize: 'clamp(3.4rem, 8vw, 6.8rem)', fontWeight: 'bold', lineHeight: 0.88, letterSpacing: '-0.075em' }}>
            {t.title.split('.')[0]}<Box component="span" sx={{ color: 'primary.main' }}>.</Box>
          </Typography>
          <Typography sx={{ mt: 4, maxWidth: '32rem', fontSize: { xs: '1rem', sm: '1.125rem' }, lineHeight: 1.7, color: 'text.secondary' }}>
            {t.subtitle}
          </Typography>
          <Box sx={{ mt: 4.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 2 }}>
            <Button variant="contained" onClick={onStart} endIcon={<ArrowRight size={17} />} data-testid="button-start-application">{t.start}</Button>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
              <LockKeyhole size={16} color="#c7342f" aria-hidden="true" />
              {t.secure}
            </Box>
          </Box>
          {hasSavedDraft && (
            <Box className="animate-rise" sx={{ mt: 5, display: 'flex', maxWidth: 400, alignItems: 'center', gap: 1.5, borderRadius: 3, border: 1, borderColor: 'primary.main', bgcolor: 'rgba(199,52,47,0.06)', p: 2 }} data-testid="card-saved-draft">
              <Save size={20} color="#c7342f" aria-hidden="true" />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 800 }}>{t.saved}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>{t.savedDesc}</Typography>
              </Box>
              <Button size="small" variant="text" onClick={onContinue} data-testid="button-continue-draft">{t.resume}</Button>
              <Button size="small" color="inherit" onClick={onDelete} aria-label={t.deleteDraft} data-testid="button-delete-draft" sx={{ minWidth: 40, px: 1 }}>
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </Box>
          )}
        </Box>
        <Box component="section" className="animate-rise" sx={{ position: 'relative', pl: { lg: 4 }, animationDelay: '100ms' }}>
          <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 6, bgcolor: 'primary.main', p: { xs: 3.5, sm: 5 }, color: 'primary.contrastText', boxShadow: '12px 12px 0 rgba(199,52,47,0.85)' }}>
            <Box sx={{ position: 'absolute', right: -56, top: -64, height: 192, width: 192, borderRadius: '50%', border: '18px solid', borderColor: 'warning.main', opacity: 0.9 }} />
            <Box sx={{ position: 'absolute', bottom: -96, left: -48, height: 192, width: 192, borderRadius: '50%', border: '18px solid', borderColor: 'warning.main', opacity: 0.7 }} />
            <Box sx={{ position: 'relative' }}>
              <Typography className="mono-label" sx={{ color: 'warning.main' }}>{t.know}</Typography>
              <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  ['01', t.k1, t.k1d],
                  ['02', t.k2, t.k2d],
                  ['03', t.k3, t.k3d],
                ].map(([number, title, text]) => (
                  <Box key={number} sx={{ display: 'flex', gap: 2 }}>
                    <Typography className="mono-label" sx={{ color: 'warning.main' }}>{number}</Typography>
                    <Box>
                      <Typography className="font-display" sx={{ fontWeight: 'bold' }}>{title}</Typography>
                      <Typography sx={{ mt: 0.5, fontSize: '0.875rem', lineHeight: 1.5, opacity: 0.68 }}>{text}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ApplicationForm({ initialData, onSubmit, onExit }: { initialData: ApplicationData; onSubmit: (data: ApplicationData) => void; onExit: () => void }) {
  const { t } = useContext(LangContext);
  const [data, setData] = useState<ApplicationData>(initialData);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState(false);

  const stepsInfo = useMemo(() => [
    { number: '01', label: t.s1, icon: UserRound },
    { number: '02', label: t.s2, icon: UsersRound },
    { number: '03', label: t.s3, icon: HardHat },
    { number: '04', label: t.s4, icon: ShieldCheck },
    { number: '05', label: t.s5, icon: FileCheck2 },
  ], [t]);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    setSavedAt(true);
    const timer = window.setTimeout(() => setSavedAt(false), 1500);
    return () => window.clearTimeout(timer);
  }, [data]);

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const updateBoolean = (name: 'canLift' | 'understandsWork' | 'consent', value: boolean) => {
    setData((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const getStepErrors = (stepToValidate: number) => {
    const nextErrors: Record<string, string> = {};
    if (stepToValidate === 0) {
      if (!data.firstName.trim()) nextErrors.firstName = t.errName;
      if (!data.lastName.trim()) nextErrors.lastName = t.errLast;
      if (!data.phone.trim()) nextErrors.phone = t.errPhone;
      if (!data.email.trim() || !data.email.includes('@')) nextErrors.email = t.errEmail;
      if (!data.streetAddress.trim()) nextErrors.streetAddress = t.errStreet;
      if (!data.city.trim()) nextErrors.city = t.errCity;
      if (!data.state.trim()) nextErrors.state = t.errState;
      if (!data.zip.trim()) nextErrors.zip = t.errZip;
    }
    if (stepToValidate === 1) {
      if (!data.emergencyName.trim()) nextErrors.emergencyName = t.errCName;
      if (!data.emergencyRelation.trim()) nextErrors.emergencyRelation = t.errCRel;
      if (!data.emergencyPhone.trim()) nextErrors.emergencyPhone = t.errCPhone;
    }
    if (stepToValidate === 2) {
      if (!data.position) nextErrors.position = t.errPos;
      if (!data.startDate) nextErrors.startDate = t.errStart;
    }
    if (stepToValidate === 3) {
      if (data.isH2b === null) nextErrors.isH2b = t.errH2b;
      if (!data.canLift) nextErrors.canLift = t.errTerms;
      if (!data.understandsWork) nextErrors.understandsWork = t.errTerms;
    }
    if (stepToValidate === 4 && !data.consent) nextErrors.consent = t.errConsent;
    return nextErrors;
  };

  const validateStep = () => {
    const nextErrors = getStepErrors(step);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAllSteps = () => {
    const stepErrors = stepsInfo.map((_, index) => getStepErrors(index));
    const firstInvalidStep = stepErrors.findIndex((item) => Object.keys(item).length > 0);
    const allErrors = Object.assign({}, ...stepErrors);
    setErrors(allErrors);
    if (firstInvalidStep !== -1) {
      setStep(firstInvalidStep);
      return false;
    }
    return true;
  };

  const isStepComplete = (index: number) => Object.keys(getStepErrors(index)).length === 0;
  const jumpToStep = (index: number) => {
    setErrors({});
    setStep(index);
  };

  const moveNext = () => { if (validateStep()) setStep((current) => Math.min(current + 1, 4)); };
  const goBack = () => { if (step === 0) onExit(); else setStep((current) => current - 1); };

  return (
    <Box className="app-content" sx={{ minHeight: 'calc(100dvh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ mx: 'auto', maxWidth: 'md', overflowX: 'auto', px: { xs: 1.5, sm: 4 }, py: 1.5 }}>
          <Box sx={{ display: 'flex', minWidth: 'max-content', alignItems: 'center', justifyContent: { xs: 'center', sm: 'space-between' }, gap: 0.5, width: { sm: 1 } }}>
          {stepsInfo.map((s, index) => {
            const Icon = s.icon;
            const complete = index !== step && isStepComplete(index);
            const active = index === step;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center' }} key={s.number}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => jumpToStep(index)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`${s.number}. ${s.label}`}
                  sx={{
                    display: 'flex', minWidth: { xs: 74, sm: 0 }, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 0.75, sm: 1.5 }, borderRadius: 2, px: { xs: 1, sm: 1.5 }, py: 0.75, transition: 'background-color 0.2s', cursor: 'pointer',
                    bgcolor: active ? 'rgba(199,52,47,0.07)' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    border: 'none',
                    outline: 'none',
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' }
                  }}
                  data-testid={`step-tab-${index + 1}`}
                >
                  <Box component="span" sx={{
                    display: 'flex', height: 32, width: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 1, fontSize: '0.75rem', fontWeight: 800, transition: 'all 0.2s',
                    borderColor: complete ? 'primary.main' : active ? 'primary.main' : 'divider',
                    bgcolor: complete ? 'primary.main' : active ? 'background.paper' : 'transparent',
                    color: complete ? 'primary.contrastText' : active ? 'primary.main' : 'text.secondary',
                    boxShadow: active ? '0 0 0 3px rgba(199,52,47,0.1)' : 'none'
                  }}>
                    {complete ? <Check size={16} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
                  </Box>
                  <Typography sx={{ maxWidth: { xs: 76, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: { xs: '0.65rem', sm: '0.75rem' }, fontWeight: 800, color: active ? 'text.primary' : 'text.secondary' }}>
                    {s.label}
                  </Typography>
                </Box>
                {index < stepsInfo.length - 1 && <Box sx={{ mx: { xs: 0.5, sm: 1 }, height: '1px', width: { xs: 16, sm: 32 }, bgcolor: complete ? 'primary.main' : 'divider' }} />}
              </Box>
            );
          })}
          </Box>
        </Box>
      </Box>

      <Box component="main" sx={{ mx: 'auto', flex: 1, width: 1, maxWidth: 'md', px: { xs: 2.5, sm: 4 }, py: { xs: 5, sm: 7 } }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button color="inherit" startIcon={<ArrowLeft size={17} />} onClick={goBack} data-testid="button-back-top">{step === 0 ? t.exit : t.back}</Button>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }} aria-live="polite">
            <Save style={{ height: 14, width: 14, animation: savedAt ? 'pulse-save 1s ease-in-out' : 'none' }} aria-hidden="true" />
            {savedAt ? t.saving : t.localSave}
          </Box>
        </Box>
        <Box key={step} className="animate-slide">
          {step === 0 && (
            <>
              <SectionHeader eyebrow={`01 / 05`} title={t.h1} detail={t.h1d} />
              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                <Field label={t.first} name="firstName" value={data.firstName} onChange={update} error={errors.firstName} />
                <Field label={t.last} name="lastName" value={data.lastName} onChange={update} error={errors.lastName} />
                <Field label={t.phone} name="phone" value={data.phone} onChange={update} type="tel" error={errors.phone} />
                <Field label={t.email} name="email" value={data.email} onChange={update} type="email" error={errors.email} />
                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <Field label={t.street} name="streetAddress" value={data.streetAddress} onChange={update} error={errors.streetAddress} />
                </Box>
                <Field label={t.cityField} name="city" value={data.city} onChange={update} error={errors.city} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Field label={t.state} name="state" value={data.state} onChange={update} error={errors.state} />
                  <Field label={t.zip} name="zip" value={data.zip} onChange={update} error={errors.zip} />
                </Box>
              </Box>
            </>
          )}
          {step === 1 && (
            <>
              <SectionHeader eyebrow={`02 / 05`} title={t.h2} detail={t.h2d} />
              <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <Field label={t.cName} name="emergencyName" value={data.emergencyName} onChange={update} error={errors.emergencyName} />
                </Box>
                <Field label={t.cRel} name="emergencyRelation" value={data.emergencyRelation} onChange={update} error={errors.emergencyRelation} />
                <Field label={t.cPhone} name="emergencyPhone" value={data.emergencyPhone} onChange={update} type="tel" error={errors.emergencyPhone} />
              </Box>
              <Box sx={{ mt: 4, display: 'flex', gap: 1.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'action.hover', p: 2, fontSize: '0.875rem', lineHeight: 1.5, color: 'text.secondary' }}>
                <Info style={{ marginTop: 2, flexShrink: 0 }} size={16} color="#c7342f" aria-hidden="true" />
                <Typography variant="body2">{t.cDesc}</Typography>
              </Box>
            </>
          )}
          {step === 2 && (
            <>
              <SectionHeader eyebrow={`03 / 05`} title={t.h3} detail={t.h3d} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <SelectField label={t.pos} name="position" value={data.position} onChange={update} placeholder="..." error={errors.position} options={t.posList} />
                <Field label={t.startD} name="startDate" value={data.startDate} onChange={update} type="date" error={errors.startDate} />
              </Box>
            </>
          )}
          {step === 3 && (
            <>
              <SectionHeader eyebrow={`04 / 05`} title={t.h4} detail={t.h4d} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography sx={{ mb: 1.5, fontSize: '0.875rem', fontWeight: 800 }}>{t.h2bq} <Box component="span" sx={{ color: 'primary.main' }}>*</Box></Typography>
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                    <Paper variant="outlined" sx={{ px: 1.5, py: .5, borderColor: data.isH2b === true ? 'primary.main' : 'divider', bgcolor: data.isH2b === true ? 'rgba(199,52,47,.06)' : 'background.paper' }}>
                      <FormControlLabel control={<Radio checked={data.isH2b === true} onChange={() => { setData(d => ({ ...d, isH2b: true })); setErrors(e => ({ ...e, isH2b: '' })); }} />} label={t.yes} />
                    </Paper>
                    <Paper variant="outlined" sx={{ px: 1.5, py: .5, borderColor: data.isH2b === false ? 'primary.main' : 'divider', bgcolor: data.isH2b === false ? 'rgba(199,52,47,.06)' : 'background.paper' }}>
                      <FormControlLabel control={<Radio checked={data.isH2b === false} onChange={() => { setData(d => ({ ...d, isH2b: false })); setErrors(e => ({ ...e, isH2b: '' })); }} />} label={t.no} />
                    </Paper>
                  </Box>
                  {errors.isH2b && <Typography className="error-text" sx={{ mt: 1 }}>{errors.isH2b}</Typography>}
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, borderTop: 1, borderColor: 'divider', pt: 3 }}>
                  {[
                    ['canLift', data.canLift, t.lift],
                    ['understandsWork', data.understandsWork, t.outdoor],
                  ].map(([name, checked, label]) => (
                    <Paper variant="outlined" key={name as string} sx={{ px: 1.5, py: .5, borderColor: checked ? 'primary.main' : 'divider', bgcolor: checked ? 'rgba(199,52,47,.06)' : 'background.paper' }}>
                      <FormControlLabel control={<Checkbox checked={checked as boolean} onChange={(event) => updateBoolean(name as 'canLift' | 'understandsWork', event.target.checked)} />} label={label as string} />
                    </Paper>
                  ))}
                  {(errors.canLift || errors.understandsWork) && <Typography className="error-text">{t.errTerms}</Typography>}
                </Box>

                <Box sx={{ mt: 4, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 2.5 }}>
                  <LockKeyhole size={20} color="#c7342f" aria-hidden="true" />
                  <Typography variant="h3" className="font-display" sx={{ mt: 1.5, fontSize: '1.125rem', fontWeight: 'bold' }}>{t.secureBlock}</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: '0.875rem', lineHeight: 1.5, color: 'text.secondary' }}>{t.secureDesc}</Typography>
                </Box>
              </Box>
            </>
          )}
          {step === 4 && (
            <>
              <SectionHeader eyebrow={`05 / 05`} title={t.h5} detail={t.h5d} />
              <Box sx={{ overflow: 'hidden', borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                {[
                  [t.first, `${data.firstName} ${data.lastName}`],
                  [t.phone, `${data.phone} · ${data.email}`],
                  [t.cityField, `${data.city}, ${data.state}`],
                  [t.s2, `${data.emergencyName} (${data.emergencyRelation})`],
                  [t.pos, t.posList.find(p => p.value === data.position)?.label || data.position],
                  [t.h2bq, data.isH2b ? t.yes : t.no],
                ].map(([label, value]) => (
                  <Box sx={{ display: 'grid', gap: 0.5, borderBottom: 1, borderColor: 'divider', px: 2, py: 1.75, '&:last-child': { borderBottom: 0 }, gridTemplateColumns: { sm: '140px 1fr' }, sm: { gap: 2 } }} key={label}>
                    <Typography className="mono-label" sx={{ color: 'text.secondary' }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{value || '—'}</Typography>
                  </Box>
                ))}
              </Box>
              <Paper variant="outlined" sx={{ mt: 4, p: 1.5, borderColor: data.consent ? 'primary.main' : 'divider', bgcolor: data.consent ? 'rgba(199,52,47,.06)' : 'background.paper' }}>
                <FormControlLabel sx={{ alignItems: 'flex-start', m: 0 }} control={<Checkbox checked={data.consent} onChange={(event) => updateBoolean('consent', event.target.checked)} />} label={t.consent} />
              </Paper>
              {errors.consent && <Typography className="error-text" sx={{ mt: 1 }}>{errors.consent}</Typography>}
            </>
          )}
        </Box>
        <Box sx={{ mt: 5, display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'space-between', gap: 1.5, borderTop: 1, borderColor: 'divider', pt: 3, sm: { alignItems: 'center' } }}>
          <Button color="inherit" startIcon={<ArrowLeft size={17} />} onClick={goBack} data-testid="button-back">{step === 0 ? t.exit : t.back}</Button>
          {step < 4 ? (
            <Button variant="contained" endIcon={<ArrowRight size={17} />} onClick={moveNext} data-testid="button-next">{t.next}</Button>
          ) : (
            <Button variant="contained" endIcon={<CheckCircle2 size={17} />} onClick={() => { if (validateAllSteps()) onSubmit(data); }} data-testid="button-submit-application">{t.submit}</Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Submitted({ onRestart, data }: { onRestart: () => void; data: ApplicationData; }) {
  const { t, lang } = useContext(LangContext);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The IRS does not send CORS headers, so the W-4 is proxied by the API,
  // which also records any failure for later review.
  const fetchPdfBytes = async (url: string): Promise<Uint8Array | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const arrayBuffer = await res.arrayBuffer();
      // 204 (nothing configured) arrives as an empty, unloadable body.
      return arrayBuffer.byteLength === 0 ? null : new Uint8Array(arrayBuffer);
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const profilePdfBytes = await generateProfilePDF(data, lang);

      const [w4Bytes, attachmentBytes] = await Promise.all([
        fetchPdfBytes(`${apiBaseUrl}/forms/w4?lang=${lang}`),
        // Active admin-uploaded templates, already merged in order by the API.
        fetchPdfBytes(`${apiBaseUrl}/forms/attachments?lang=${lang}`),
      ]);

      // Whatever is unavailable is skipped: the applicant still gets a packet.
      const parts = [profilePdfBytes, w4Bytes, attachmentBytes].filter((part): part is Uint8Array => part !== null);
      const pdfBytes = parts.length > 1 ? await mergePDFs(parts) : profilePdfBytes;

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Kodiak_Profile_${data.firstName}_${data.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError(t.generateError);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', display: 'flex', minHeight: 'calc(100dvh - 80px)', width: 1, maxWidth: 'md', alignItems: 'center', px: { xs: 2.5, sm: 4 }, py: 6 }}>
      <Box className="animate-rise" sx={{ width: 1 }}>
        <Box sx={{ mx: 'auto', display: 'flex', height: 80, width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: '0 0 0 10px rgba(199,52,47,0.12)' }}>
          <Check size={36} strokeWidth={3} aria-hidden="true" />
        </Box>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h1" className="font-display" sx={{ fontSize: { xs: '2.25rem', sm: '3rem' }, fontWeight: 'bold', letterSpacing: '-0.05em' }}>{t.done}</Typography>
          <Typography sx={{ mx: 'auto', mt: 2, maxWidth: '32rem', fontSize: '1rem', lineHeight: 1.7, color: 'text.secondary' }}>{t.doneSub}</Typography>
        </Box>
        
        <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 4, textAlign: 'center' }}>
          <FileText size={40} color="#c7342f" aria-hidden="true" />
          <Button variant="contained" sx={{ mt: 1 }} onClick={handleDownload} disabled={isGenerating} startIcon={isGenerating ? <RotateCcw className="animate-spin" size={17} /> : <Download size={17} />}>{t.downloadBtn}</Button>
          {error && <Typography sx={{ mt: 1, fontSize: '0.875rem', fontWeight: 'bold', color: 'error.main' }}>{error}</Typography>}
        </Box>

        <Button variant="outlined" sx={{ mx: 'auto', mt: 3, display: 'flex' }} onClick={onRestart} startIcon={<RotateCcw size={17} />}>{t.restart}</Button>
      </Box>
    </Box>
  );
}

function Home() {
  const [mode, setMode] = useState<'welcome' | 'form' | 'submitted'>(() => (
    readStorage(SUBMITTED_KEY, false) ? 'submitted' : 'welcome'
  ));
  const [draft, setDraft] = useState<ApplicationData>(() => readStorage(DRAFT_KEY, emptyData));

  const submit = async (data: ApplicationData) => {
    try {
      await submitApplication({
        ...data,
        isH2b: data.isH2b as boolean,
        canLift: true,
        understandsWork: true,
        consent: true,
      });
      window.localStorage.removeItem(DRAFT_KEY);
      window.localStorage.setItem(SUBMITTED_KEY, JSON.stringify(true));
      setDraft(data);
      setMode('submitted');
    } catch {
      window.alert('We could not securely submit your application. Please try again.');
    }
  };
  const restart = () => {
    window.localStorage.removeItem(SUBMITTED_KEY);
    window.localStorage.removeItem(DRAFT_KEY);
    setDraft(emptyData);
    setMode('welcome');
  };

  return (
    <>
      {mode === 'welcome' && <Welcome draft={draft} onStart={() => setMode('form')} onContinue={() => setMode('form')} onDelete={restart} />}
      {mode === 'form' && <ApplicationForm initialData={draft} onSubmit={submit} onExit={() => setMode('welcome')} />}
      {mode === 'submitted' && <Submitted onRestart={restart} data={draft} />}
    </>
  );
}

// --- PDF templates ---

type PdfTemplate = {
  id: string; name: string; lang: 'en' | 'es' | 'both'; active: boolean;
  order: number; size: number; pageCount: number; uploadedByEmail: string; updatedAt: string | null;
};

type AuthOptions = () => Promise<{ headers: Record<string, string>; cache: RequestCache }>;

const apiBaseUrl = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function PdfTemplates({ authOptions }: { authOptions: AuthOptions }) {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'en' | 'es' | 'both'>('both');
  const [order, setOrder] = useState('0');

  const request = async <T,>(path: string, init: RequestInit = {}): Promise<T | null> => {
    const auth = await authOptions();
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      cache: auth.cache,
      headers: { ...auth.headers, ...init.headers },
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(detail?.error ?? `Request failed (${response.status})`);
    }
    return response.status === 204 ? null : ((await response.json()) as T);
  };

  const load = async () => {
    try {
      setTemplates((await request<PdfTemplate[]>('/pdf-templates')) ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load templates.');
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const upload = () => run(async () => {
    if (!file) throw new Error('Choose a PDF first.');
    const query = new URLSearchParams({
      name: name.trim() || file.name.replace(/\.pdf$/i, ''),
      lang,
      order: order.trim() || '0',
    });
    await request(`/pdf-templates?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    });
    setFile(null);
    setName('');
    setOrder('0');
  });

  const patch = (id: string, body: Partial<Pick<PdfTemplate, 'name' | 'lang' | 'active' | 'order'>>) => run(() =>
    request(`/pdf-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  const remove = (template: PdfTemplate) => {
    if (!window.confirm(`Delete "${template.name}"? Applicants will stop receiving it.`)) return;
    return run(() => request(`/pdf-templates/${template.id}`, { method: 'DELETE' }));
  };

  const download = async (template: PdfTemplate) => {
    try {
      const auth = await authOptions();
      const response = await fetch(`${apiBaseUrl}/pdf-templates/${template.id}/file`, { headers: auth.headers });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not download that template.');
    }
  };

  return (
    <Paper variant="outlined" component="section" sx={{ mt: 4, p: { xs: 3, sm: 4 } }}>
      <Typography variant="h2" className="font-display" sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Packet templates</Typography>
      <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>
        Active templates are added to every applicant packet, after the profile pages and the IRS W-4, in the order below.
      </Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, borderRadius: 2, border: 1, borderColor: 'divider', p: 2 }}>
        <Button component="label" variant="outlined" startIcon={<FileText size={16} />}>
          {file ? file.name : 'Choose PDF'}
          <input
            hidden
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const chosen = e.target.files?.[0] ?? null;
              setFile(chosen);
              if (chosen && !name.trim()) setName(chosen.name.replace(/\.pdf$/i, ''));
              e.target.value = '';
            }}
          />
        </Button>
        <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ minWidth: 200 }} />
        <TextField size="small" select label="Language" value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'es' | 'both')} sx={{ minWidth: 140 }}>
          <MenuItem value="both">Both</MenuItem>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="es">Spanish</MenuItem>
        </TextField>
        <TextField size="small" label="Order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} sx={{ width: 100 }} />
        <Button variant="contained" startIcon={<Plus size={16} />} disabled={!file || busy} onClick={upload}>Upload</Button>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {templates.length === 0 && <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>No templates uploaded yet.</Typography>}
        {templates.map((template) => (
          <Box key={template.id} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', p: 1.5 }}>
            <Box sx={{ flexGrow: 1, minWidth: 200 }}>
              <Typography sx={{ fontWeight: 'bold' }}>{template.name}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {template.pageCount} page{template.pageCount === 1 ? '' : 's'} · {formatSize(template.size)} · {template.uploadedByEmail}
              </Typography>
            </Box>
            <Chip size="small" label={template.lang === 'both' ? 'EN + ES' : template.lang.toUpperCase()} />
            <TextField
              size="small" type="number" label="Order" defaultValue={template.order} disabled={busy} sx={{ width: 90 }}
              onBlur={(e) => Number(e.target.value) !== template.order && patch(template.id, { order: Number(e.target.value) })}
            />
            <FormControlLabel
              label="Active"
              control={<Checkbox checked={template.active} disabled={busy} onChange={(e) => patch(template.id, { active: e.target.checked })} />}
            />
            <Button size="small" color="inherit" startIcon={<Download size={15} />} onClick={() => download(template)}>Download</Button>
            <Button size="small" color="error" startIcon={<Trash2 size={15} />} disabled={busy} onClick={() => remove(template)}>Delete</Button>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// --- Admin ---

function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [revealed, setRevealed] = useState<{ field: string; value: string } | null>(null);

  const requireAuth = () => {
    if (!firebaseAuth?.currentUser) throw new Error('Firebase is not configured');
    return firebaseAuth;
  };

  const authOptions = async () => ({
    headers: { Authorization: `Bearer ${await requireAuth().currentUser!.getIdToken()}` },
    cache: 'no-store' as RequestCache,
  });

  const loadApplications = async () => {
    const records = await listApplications(await authOptions());
    setApplications(records);
  };

  useEffect(() => {
    if (!firebaseAuth) {
      setCheckingAuth(false);
      return;
    }
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setCheckingAuth(false);
      if (nextUser) loadApplications().catch(() => setError('Your account is not approved for staff access.'));
      else {
        setApplications([]);
        setSelected(null);
        setRevealed(null);
      }
    });
  }, []);

  const login = async () => {
    setError('');
    try {
      await signInWithEmailAndPassword(firebaseAuth!, email, password);
      setPassword('');
    } catch {
      setError('Sign-in failed. Check your staff email and password.');
    }
  };

  const loginWithGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign-in failed. Try again or use your email and password.');
    }
  };

  const selectApplication = async (id: string) => {
    setError('');
    setRevealed(null);
    try {
      setSelected(await getApplication(id, await authOptions()));
    } catch {
      setError('Could not load this application.');
    }
  };

  const reveal = async (field: 'ssn' | 'passportNumber') => {
    if (!selected) return;
    const reason = window.prompt('Enter the business reason for revealing this value:');
    if (!reason) return;
    try {
      const result = await revealApplicationSensitiveField(selected.id, field, { reason }, await authOptions());
      setRevealed(result);
    } catch {
      setError('Could not reveal this value. A reason of at least 5 characters is required.');
    }
  };

  if (checkingAuth) return <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'md', p: 5 }}><Typography>Checking staff access…</Typography></Box>;
  if (!firebaseAuth) return <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'md', p: 5 }}><Alert severity="warning">Staff access is not configured yet. Add the Firebase workspace settings to enable sign-in.</Alert></Box>;
  if (!user) return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'md', p: { xs: 3, sm: 5 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
        <LockKeyhole style={{ marginBottom: 16 }} size={32} color="#c7342f" />
        <Typography variant="h1" className="font-display" sx={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Staff sign in</Typography>
        <Typography sx={{ mt: 1, mb: 3, fontSize: '0.875rem', color: 'text.secondary' }}>Only approved, verified staff accounts can review applications.</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Staff email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button fullWidth variant="contained" startIcon={<LogIn size={17} />} onClick={login}>Sign in</Button>
          <Divider>or</Divider>
          <Button fullWidth variant="outlined" color="inherit" onClick={loginWithGoogle}>Sign in with Google</Button>
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'lg', p: { xs: 3, sm: 5 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', pb: 3 }}>
        <Box><Typography variant="h1" className="font-display" sx={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Submitted applications</Typography><Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>Signed in as {user.email}</Typography></Box>
        <Button color="inherit" startIcon={<LogOut size={17} />} onClick={() => signOut(requireAuth())}>Sign out</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '340px 1fr' } }}>
        <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {applications.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography sx={{ fontSize: '0.875rem' }}>No applications have been submitted.</Typography></Paper>}
          {applications.map((item) => (
            <Box component="button" key={item.id} onClick={() => selectApplication(item.id)} sx={{ width: 1, borderRadius: 3, border: 1, borderColor: selected?.id === item.id ? 'primary.main' : 'divider', bgcolor: selected?.id === item.id ? 'rgba(199,52,47,0.06)' : 'background.paper', p: 2, textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s', '&:hover': { borderColor: 'primary.main' } }}>
              <Typography sx={{ fontWeight: 'bold' }}>{item.firstName} {item.lastName}</Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>{item.position} · {new Date(item.submittedAt).toLocaleDateString()}</Typography>
            </Box>
          ))}
        </Box>
        <Box component="section">
          {!selected ? <Paper variant="outlined" sx={{ p: 4 }}><Typography>Select an application to review it.</Typography></Paper> : (
            <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
              <Typography variant="h2" className="font-display" sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selected.firstName} {selected.lastName}</Typography>
              <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr' } }}>
                {[
                  ['Email', selected.email], ['Phone', selected.phone], ['Address', `${selected.streetAddress}, ${selected.city}, ${selected.state} ${selected.zip}`],
                  ['Emergency contact', `${selected.emergencyName} (${selected.emergencyRelation}) · ${selected.emergencyPhone}`],
                  ['Position', selected.position], ['Available', selected.startDate], ['H-2B applicant', selected.isH2b ? 'Yes' : 'No'],
                ].map(([label, value]) => <Box key={label}><Typography className="mono-label" sx={{ color: 'text.secondary' }}>{label}</Typography><Typography sx={{ mt: 0.5, fontSize: '0.875rem', fontWeight: 'bold' }}>{value}</Typography></Box>)}
              </Box>
              <Box sx={{ mt: 4, borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Typography variant="h3" className="font-display" sx={{ fontWeight: 'bold' }}>Sensitive information</Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>Values are encrypted and masked. Every reveal requires a reason and is audited.</Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {([['ssn', 'SSN', selected.ssnMasked], ['passportNumber', 'Passport', selected.passportNumberMasked]] as const).map(([field, label, masked]) => (
                    <Box key={field} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2, border: 1, borderColor: 'divider', p: 1.5 }}>
                      <Box><Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{label}</Typography><Typography sx={{ fontFamily: 'monospace' }}>{revealed?.field === field ? revealed.value : masked ?? 'Not provided'}</Typography></Box>
                      {masked && <Button size="small" variant="outlined" startIcon={<Eye size={15} />} onClick={() => reveal(field)}>Reveal</Button>}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
      <PdfTemplates authOptions={authOptions} />
    </Box>
  );
}

type StaffProfile ={ uid: string; email: string; displayName: string; role: 'admin' | 'manager' | 'member' };
type WorkTask = {
  id: string; title: string; description: string; assigneeUid: string; assigneeName: string;
  dueDate: string | null; status: 'todo' | 'in_progress' | 'completed';
  createdAt: string; updatedAt: string; createdByName: string;
};

function Tasks() {
  const { t: taskT, i18n: taskI18n } = useTranslation('tasks');
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUid, setAssigneeUid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');
  const [setupLink, setSetupLink] = useState('');
  const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

  const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    if (!firebaseAuth?.currentUser) throw new Error(taskT('signInRequired'));
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await firebaseAuth.currentUser.getIdToken()}`,
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
    return response.status === 204 ? undefined as T : response.json();
  };

  const load = async () => {
    const me = await api<StaffProfile>('/staff/me');
    setProfile(me);
    const taskRows = await api<WorkTask[]>('/tasks');
    setTasks(taskRows);
    if (me.role !== 'member') {
      const people = await api<StaffProfile[]>('/staff');
      setStaff(people);
      if (!assigneeUid && people.length) setAssigneeUid(people[0].uid);
    }
  };

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (next) => {
      setUser(next);
      if (next) load().catch((e) => setError(e.message));
      else { setProfile(null); setTasks([]); setStaff([]); }
    });
  }, []);

  const login = async () => {
    setError('');
    try { await signInWithEmailAndPassword(firebaseAuth!, email, password); setPassword(''); }
    catch { setError(taskT('signInFailed')); }
  };

  const loginWithGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch { setError(taskT('googleSignInFailed')); }
  };

  const createTask = async () => {
    setError('');
    try {
      const created = await api<WorkTask>('/tasks', { method: 'POST', body: JSON.stringify({ title, description, assigneeUid, dueDate }) });
      setTasks((current) => [created, ...current]);
      setTitle(''); setDescription(''); setDueDate('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create task'); }
  };

  const updateStatus = async (task: WorkTask, status: WorkTask['status']) => {
    try {
      const updated = await api<WorkTask>(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (e) { setError(e instanceof Error ? e.message : taskT('updateFailed')); }
  };

  const invite = async () => {
    setError(''); setSetupLink('');
    try {
      const invited = await api<StaffProfile & { setupLink: string }>('/staff/invite', { method: 'POST', body: JSON.stringify({ email: inviteEmail, displayName: inviteName, role: inviteRole }) });
      setStaff((current) => [...current.filter((person) => person.uid !== invited.uid), invited]);
      setSetupLink(invited.setupLink); setInviteEmail(''); setInviteName('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not invite employee'); }
  };

  if (!firebaseAuth) return <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'md', p: 5 }}><Alert severity="warning">{taskT('firebaseMissing')}</Alert></Box>;
  if (!user) return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'md', p: { xs: 3, sm: 5 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
        <ClipboardList style={{ marginBottom: 16 }} size={32} color="#c7342f" />
        <Typography variant="h1" className="font-display" sx={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{taskT('title')}</Typography>
        <Typography sx={{ mt: 1, mb: 3, fontSize: '0.875rem', color: 'text.secondary' }}>{taskT('signInPrompt')}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={taskT('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label={taskT('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button fullWidth variant="contained" onClick={login} startIcon={<LogIn size={17}/>}>{taskT('signIn')}</Button>
          <Divider>{taskT('or')}</Divider>
          <Button fullWidth variant="outlined" color="inherit" onClick={loginWithGoogle}>{taskT('signInWithGoogle')}</Button>
        </Box>
      </Paper>
    </Box>
  );

  const columns: { status: WorkTask['status']; label: string }[] = [
    { status: 'todo', label: taskT('todo') }, { status: 'in_progress', label: taskT('inProgress') }, { status: 'completed', label: taskT('completed') },
  ];
  return (
    <Box component="main" className="app-content" sx={{ mx: 'auto', maxWidth: 'xl', p: { xs: 2.5, sm: 4 } }}>
      <Box sx={{ mb: 3.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyItems: 'space-between', gap: 1.5, justifyContent: 'space-between' }}>
        <Box><Typography variant="h1" className="font-display" sx={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{taskT('title')}</Typography><Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{profile?.role !== 'member' ? taskT('managerSubtitle') : taskT('memberSubtitle', { name: profile?.displayName || user.email })}</Typography></Box>
        <Button color="inherit" startIcon={<LogOut size={17}/>} onClick={() => signOut(firebaseAuth!)}>{taskT('signOut')}</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {profile?.role !== 'member' && (
        <Box sx={{ mb: 3.5, display: 'grid', gap: 2, gridTemplateColumns: { lg: '1fr 1fr' } }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h2" className="font-display" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 'bold' }}>Create task</Typography>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
              <TextField label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ gridColumn: '1 / -1' }} />
              <TextField label="Description" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} sx={{ gridColumn: '1 / -1' }} />
              <TextField select label="Assign to" value={assigneeUid} onChange={(e) => setAssigneeUid(e.target.value)}>{staff.map((person) => <MenuItem key={person.uid} value={person.uid}>{person.displayName}</MenuItem>)}</TextField>
              <TextField label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button variant="contained" startIcon={<Plus size={17}/>} onClick={createTask} disabled={!title.trim() || !assigneeUid} sx={{ gridColumn: '1 / -1' }}>Create task</Button>
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h2" className="font-display" sx={{ mb: 2, fontSize: '1.25rem', fontWeight: 'bold' }}>Invite employee</Typography>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { sm: '1fr 1fr' } }}>
              <TextField label="Employee name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              <TextField label="Employee email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              {profile?.role === 'admin' && (
                <TextField select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'manager' | 'member')} sx={{ gridColumn: '1 / -1' }}>
                  <MenuItem value="member">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </TextField>
              )}
              <Button variant="outlined" startIcon={<UserPlus size={17}/>} onClick={invite} disabled={!inviteName.trim() || !inviteEmail.includes('@')} sx={{ gridColumn: '1 / -1' }}>Create invitation</Button>
              {setupLink && <Alert severity="success" sx={{ gridColumn: '1 / -1', overflowWrap: 'anywhere' }}>Send this one-time setup link to the employee: <a style={{ textDecoration: 'underline' }} href={setupLink}>{setupLink}</a></Alert>}
            </Box>
          </Paper>
        </Box>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { lg: 'repeat(3, 1fr)' } }}>
        {columns.map((column) => (
          <Box component="section" key={column.status}>
            <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="h2" className="font-display" sx={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{column.label}</Typography><Chip size="small" label={tasks.filter((task) => task.status === column.status).length}/></Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {tasks.filter((task) => task.status === column.status).map((task) => (
                <Paper key={task.id} variant="outlined" sx={{ p: 2.5 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>{task.title}</Typography>
                  {task.description && <Typography sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>{task.description}</Typography>}
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}><Chip size="small" label={task.assigneeName}/>{task.dueDate && <Chip size="small" variant="outlined" label={taskT('due', { date: new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(taskI18n.language) })}/>}</Box>
                  <TextField select size="small" label={taskT('status')} value={task.status} onChange={(e) => updateStatus(task, e.target.value as WorkTask['status'])} sx={{ mt: 2 }}>
                    {columns.map((option) => <MenuItem key={option.status} value={option.status}>{option.label}</MenuItem>)}
                  </TextField>
                </Paper>
              ))}
              {!tasks.some((task) => task.status === column.status) && <Paper variant="outlined" sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>{taskT('noTasks')}</Paper>}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Layout() {
  const [lang, setLang] = useState<Lang>('en');
  const { mode, toggleMode } = useContext(ColorModeContext);
  const t = translations[lang];
  const changeLanguage = (next: Lang) => {
    setLang(next);
    void i18n.changeLanguage(next);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <Box className="app-shell" sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box component="header" className="app-content" sx={{ mx: 'auto', display: 'flex', height: 80, width: 1, maxWidth: 'lg', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: { xs: 1.5, sm: 4, lg: 6 } }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <BrandMark />
          </Link>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 }, minWidth: 0 }}>
            <Link href="/tasks" className="mono-label" style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
            <Link href="/admin" className="mono-label" style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'inherit', textDecoration: 'none' }}>Admin</Link>
            <Button
              onClick={toggleMode}
              variant="outlined"
              size="small"
              aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={mode === 'light' ? 'Dark mode' : 'Light mode'}
              sx={{ minWidth: 36, px: 0.75, ml: { xs: 0, sm: 1 } }}
            >
              {mode === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </Button>
            <Button
              onClick={() => changeLanguage(lang === 'en' ? 'es' : 'en')}
              variant="outlined"
              size="small"
              startIcon={<Globe size={15} />}
              sx={{ minWidth: { xs: 44, sm: 64 }, px: { xs: 0.75, sm: 1.25 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{lang === 'en' ? 'EN / ES' : 'ES / EN'}</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>{lang.toUpperCase()}</Box>
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }}>
          <ErrorBoundary>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/admin" component={Admin} />
              <Route path="/tasks" component={Tasks} />
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </Box>

        <Box component="footer" className="app-content" sx={{ mx: 'auto', display: 'flex', width: 1, maxWidth: 'lg', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2.5, sm: 4, lg: 6 }, pb: 3, pt: 1, fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}>
          <span>© {new Date().getFullYear()} Kodiak Landscaping &amp; Construction</span>
          <span>Ogden, UT</span>
        </Box>
      </Box>
    </LangContext.Provider>
  );
}

export default function App() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const saved = window.localStorage.getItem(COLOR_MODE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const muiTheme = useMemo(() => createKodiakTheme(mode), [mode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
    window.localStorage.setItem(COLOR_MODE_KEY, mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    mode,
    toggleMode: () => setMode((current) => current === 'light' ? 'dark' : 'light'),
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Layout />
          </WouterRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
