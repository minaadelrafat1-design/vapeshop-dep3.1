import type { UserRole } from '@apptypes';

// ============================================================
// Brand Colors — mirrors the web ERP's dark gold theme
// ============================================================

export const COLORS = {
  ink: {
    50: '#f6f7f9',
    100: '#eceef2',
    200: '#d4d8e0',
    300: '#aab2c0',
    400: '#7c8696',
    500: '#5a6473',
    600: '#444c58',
    700: '#353c46',
    800: '#222830',
    900: '#161b20',
    950: '#0c0f13',
  },
  gold: {
    50: '#fbf7ee',
    100: '#f5ecd2',
    200: '#ead7a3',
    300: '#ddbd6b',
    400: '#d4a649',
    500: '#c08f2e',
    600: '#a3721f',
    700: '#83571b',
    800: '#6c461b',
    900: '#5c3c1a',
  },
  accent: {
    400: '#3dc98a',
    500: '#1cae6f',
    600: '#108a56',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  background: '#0c0f13',
  surface: '#161b20',
  surfaceElevated: '#222830',
  border: '#ffffff1a',
  textPrimary: '#f6f7f9',
  textSecondary: '#aab2c0',
  textMuted: '#7c8696',
} as const;

// ============================================================
// Role Labels
// ============================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  staff: 'Staff',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
  company_owner: 'Company Owner',
  general_manager: 'General Manager',
  warehouse_manager: 'Warehouse Manager',
  branch_manager: 'Branch Manager',
  inventory_employee: 'Inventory Employee',
  sales_employee: 'Sales Employee',
  marketing: 'Marketing',
  accountant: 'Accountant',
  customer_support: 'Customer Support',
};

export function roleLabel(role: UserRole | string | null | undefined): string {
  return ROLE_LABELS[role as UserRole] ?? 'User';
}

// ============================================================
// App Config
// ============================================================

export const APP_CONFIG = {
  name: 'LUXE ERP',
  sessionTimeoutMs: 8 * 60 * 60 * 1000,
  lowStockThreshold: 10,
  currency: 'USD',
  itemsPerPage: 20,
} as const;

// ============================================================
// Permission Module Groups — for navigation organization
// ============================================================

export const NAV_GROUPS = [
  'overview',
  'commerce',
  'inventory',
  'operations',
  'purchasing',
  'insights',
  'administration',
] as const;

export type NavGroup = (typeof NAV_GROUPS)[number];
