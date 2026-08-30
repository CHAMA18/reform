import { create } from 'zustand';

/**
 * Walkthrough Tour Engine
 *
 * A multi-page guided tour that works across route changes. Each step targets
 * a CSS selector (data-tour attribute) on a specific route. When a step is on
 * a different route, the tour navigates there first, then highlights the element.
 *
 * The tour is launched from Settings or the app shell header. Progress is
 * persisted to localStorage so a user can dismiss it and not see it again
 * (until they manually re-start it from Settings).
 */

export interface TourStep {
  /** Unique id for this step. */
  id: string;
  /** The route this step lives on (e.g. "/dashboard"). */
  route: string;
  /** CSS selector for the element to highlight. */
  selector: string;
  /** Title shown in the tooltip. */
  title: string;
  /** Body text shown in the tooltip. */
  body: string;
  /** Optional: side of the target to place the tooltip (defaults to bottom). */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * The full tour — covers every major section of the application.
 * Steps are grouped by route. The tour engine navigates between routes
 * as needed.
 */
export const TOUR_STEPS: TourStep[] = [
  // --- Dashboard ---
  {
    id: 'dashboard-intro',
    route: '/dashboard',
    selector: '[data-tour="dashboard-header"]',
    title: 'Welcome to Reform',
    body: 'This is your command center. From here you can see form stats, manage your forms, and navigate to every section of the app. Let me walk you through everything.',
    side: 'bottom',
  },
  {
    id: 'dashboard-stats',
    route: '/dashboard',
    selector: '[data-tour="dashboard-stats"]',
    title: 'System Metrics',
    body: 'These cards show your system health, active form count, and submission throughput. They update in real time as forms are published and responses come in.',
    side: 'bottom',
  },
  {
    id: 'dashboard-form-library',
    route: '/dashboard',
    selector: '[data-tour="dashboard-form-library"]',
    title: 'Form Library',
    body: 'Your published forms appear here. Each card shows the form name, status (Live/Draft), submission count, and last update time.',
    side: 'top',
  },
  {
    id: 'dashboard-create',
    route: '/dashboard',
    selector: '[data-tour="create-form-btn"]',
    title: 'Create a New Form',
    body: 'Click this button to open the visual Flowchart Builder and design a new form from scratch. We\'ll explore this in detail next.',
    side: 'bottom',
  },

  // --- Templates ---
  {
    id: 'templates-intro',
    route: '/templates',
    selector: '[data-tour="templates-header"]',
    title: 'Template Library',
    body: 'Not sure where to start? Browse our pre-built templates — each one is a complete form with validation rules that you can customize and publish in seconds.',
    side: 'bottom',
  },
  {
    id: 'templates-grid',
    route: '/templates',
    selector: '[data-tour="templates-grid"]',
    title: 'Starter Templates',
    body: 'Click "Use Template" to load any of these into the builder. Templates include KYC forms, feedback surveys, event registrations, support tickets, job applications, and contact forms.',
    side: 'top',
  },
  {
    id: 'templates-published',
    route: '/templates',
    selector: '[data-tour="templates-published"]',
    title: 'Your Published Forms',
    body: 'Every form you publish appears in this table. You can copy the share link, open the live form, or jump straight to its submissions.',
    side: 'top',
  },

  // --- Form Builder ---
  {
    id: 'builder-intro',
    route: '/forms/new',
    selector: '[data-tour="builder-header"]',
    title: 'Flowchart Builder',
    body: 'This is the heart of Reform — a visual node editor where you design forms by dragging and connecting nodes. No code required.',
    side: 'bottom',
  },
  {
    id: 'builder-palette',
    route: '/forms/new',
    selector: '[data-tour="builder-palette"]',
    title: 'Node Palette',
    body: 'Drag node types onto the canvas: Start (entry point), Input Field (user input), Condition (branching logic), Submit (form submission), and End (terminal). You can also click a node type to add it.',
    side: 'right',
  },
  {
    id: 'builder-canvas',
    route: '/forms/new',
    selector: '[data-tour="builder-canvas"]',
    title: 'Canvas',
    body: 'Drag nodes to reposition them. Drag from a node\'s output handle (the colored dot on its edge) to another node to connect them. Condition nodes have two outputs — green "true" and red "false" — for branching. Scroll to zoom, drag the background to pan.',
    side: 'top',
  },
  {
    id: 'builder-inspector',
    route: '/forms/new',
    selector: '[data-tour="builder-inspector"]',
    title: 'Property Inspector',
    body: 'Select a node to edit its properties here. For field nodes you can set the label, field type (13 types available), placeholder, required toggle, options (for dropdowns), and — crucially — dynamic validation rules (min/max length, regex patterns, numeric ranges, date ranges).',
    side: 'left',
  },
  {
    id: 'builder-json',
    route: '/forms/new',
    selector: '[data-tour="builder-json"]',
    title: 'Live JSON Schema',
    body: 'As you build, the JSON schema generates in real time. This is the dynamic configuration that gets stored and used to validate submissions at runtime. You can copy it with the copy button.',
    side: 'left',
  },
  {
    id: 'builder-deploy',
    route: '/forms/new',
    selector: '[data-tour="builder-deploy"]',
    title: 'Publish Your Form',
    body: 'When your form is ready, click "Deploy Schema". The builder validates your flowchart, saves it to the database, and generates a shareable link you can send to anyone.',
    side: 'bottom',
  },

  // --- Submissions ---
  {
    id: 'submissions-intro',
    route: '/submissions',
    selector: '[data-tour="submissions-header"]',
    title: 'Submissions Dashboard',
    body: 'Every form response — whether submitted via the public link or the REST API — appears here in real time. No refresh needed.',
    side: 'bottom',
  },
  {
    id: 'submissions-metrics',
    route: '/submissions',
    selector: '[data-tour="submissions-metrics"]',
    title: 'Live Metrics',
    body: 'Track total submissions, active forms, and the latest activity timestamp. These numbers update as responses come in.',
    side: 'bottom',
  },
  {
    id: 'submissions-table',
    route: '/submissions',
    selector: '[data-tour="submissions-table"]',
    title: 'Submission Index',
    body: 'Each row is a form response. The preview column shows the first few field values. Click "View" to expand and see the full JSON payload. Use the search box to filter by form name, submission ID, or response content.',
    side: 'top',
  },

  // --- API Keys ---
  {
    id: 'apikeys-intro',
    route: '/api-keys',
    selector: '[data-tour="apikeys-header"]',
    title: 'Developer API',
    body: 'Reform exposes a full REST API. Create API keys here to integrate your forms with third-party software, webhooks, and automation.',
    side: 'bottom',
  },
  {
    id: 'apikeys-create',
    route: '/api-keys',
    selector: '[data-tour="apikeys-create"]',
    title: 'Create API Keys',
    body: 'Click "Create Key" to generate a new API key. Choose a name and select permission scopes (forms:read, forms:write, submissions:read, submissions:write). The full key is shown ONCE — store it securely.',
    side: 'bottom',
  },
  {
    id: 'apikeys-table',
    route: '/api-keys',
    selector: '[data-tour="apikeys-table"]',
    title: 'Key Management',
    body: 'Each key shows its prefix (for identification), status, permissions, last used time, and creation date. Use the rotate icon (↻) to generate a new key string — the old one immediately stops working. Use the trash icon to revoke a key permanently.',
    side: 'top',
  },
  {
    id: 'apikeys-docs',
    route: '/api-keys',
    selector: '[data-tour="apikeys-docs"]',
    title: 'API Documentation',
    body: 'Click "API Docs" to view the full REST API reference with interactive examples, code snippets in JavaScript and Python, and a "Try It Live" panel where you can test endpoints directly.',
    side: 'bottom',
  },

  // --- Settings ---
  {
    id: 'settings-intro',
    route: '/settings',
    selector: '[data-tour="settings-header"]',
    title: 'Settings',
    body: 'Configure your Reform workspace. This is also where you can restart this walkthrough at any time if you need a refresher.',
    side: 'bottom',
  },
  {
    id: 'settings-walkthrough',
    route: '/settings',
    selector: '[data-tour="settings-walkthrough"]',
    title: 'Restart the Tour',
    body: 'That\'s the end of the tour! You can restart it anytime from Settings here, or from the "?" button in the top navigation. Welcome aboard — go build something amazing.',
    side: 'top',
  },
];

const STORAGE_KEY = 'reform-tour-completed';

interface WalkthroughState {
  /** Whether the tour is currently active. */
  active: boolean;
  /** Index into TOUR_STEPS for the current step. */
  currentStep: number;
  /** Whether the user has completed the tour before. */
  completed: boolean;

  start: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  goTo: (index: number) => void;
  markCompleted: () => void;
  loadCompleted: () => void;
}

export const useWalkthrough = create<WalkthroughState>((set, get) => ({
  active: false,
  currentStep: 0,
  completed: false,

  start: () => set({ active: true, currentStep: 0 }),

  next: () => {
    const { currentStep } = get();
    if (currentStep + 1 >= TOUR_STEPS.length) {
      // Tour finished
      set({ active: false, completed: true });
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  stop: () => set({ active: false }),

  goTo: (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      set({ currentStep: index });
    }
  },

  markCompleted: () => {
    set({ completed: true });
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  },

  loadCompleted: () => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === 'true') set({ completed: true });
    } catch {
      // ignore
    }
  },
}));
