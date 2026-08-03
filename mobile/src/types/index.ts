// ============================================================
// Auth Types
// ============================================================

export type UserRole =
  | 'customer'
  | 'staff'
  | 'manager'
  | 'admin'
  | 'super_admin'
  | 'company_owner'
  | 'general_manager'
  | 'warehouse_manager'
  | 'branch_manager'
  | 'inventory_employee'
  | 'sales_employee'
  | 'marketing'
  | 'accountant'
  | 'customer_support';

export type UserStatus = 'active' | 'suspended' | 'locked';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: Profile;
  accessToken: string;
}

// ============================================================
// Permission Types
// ============================================================

export type AccessLevel = 'none' | 'view' | 'edit';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
}

export interface PermissionGrant {
  permissionName: string;
  canEdit: boolean;
}

// ============================================================
// Role Hierarchy
// ============================================================

export const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  company_owner: 100,
  admin: 100,
  general_manager: 80,
  warehouse_manager: 60,
  branch_manager: 60,
  manager: 60,
  inventory_employee: 40,
  sales_employee: 40,
  marketing: 40,
  accountant: 40,
  customer_support: 40,
  staff: 20,
  customer: 0,
};

export function roleRank(role: string | undefined | null): number {
  return ROLE_RANK[role ?? ''] ?? 0;
}

export const STAFF_ROLES: UserRole[] = [
  'admin', 'manager', 'staff',
  'super_admin', 'company_owner', 'general_manager',
  'warehouse_manager', 'branch_manager', 'inventory_employee',
  'sales_employee', 'marketing', 'accountant', 'customer_support',
];

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isAdminRole(role: UserRole | undefined | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'company_owner';
}

// ============================================================
// Navigation Types
// ============================================================

export type AppTab = 'dashboard' | 'orders' | 'inventory' | 'more';

export interface NavigationParams {
  screen?: string;
  id?: string;
  from?: string;
}
