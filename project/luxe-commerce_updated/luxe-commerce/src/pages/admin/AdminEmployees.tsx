import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useAdminTable } from '@/hooks/useAdminTable';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/AdminComponents';
import { Button } from '@/components/ui/Button';
import { Badge, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Employee, Branch, Role, Permission } from '@/types';
import { formatDate } from '@/lib/utils';
import { canAssignRole, canManageEmployees } from '@/lib/auth';

interface EmployeeForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  branch_id: string;
  hire_date: string;
  status: string;
  // Account creation fields (only for new employees)
  role: string;
  password: string;
}

const emptyForm: EmployeeForm = {
  first_name: '', last_name: '', email: '', phone: '', position: '', branch_id: '', hire_date: '', status: 'active',
  role: 'sales_employee', password: '',
};

const STAFF_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'company_owner', label: 'Company Owner' },
  { value: 'general_manager', label: 'General Manager' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'inventory_employee', label: 'Inventory Employee' },
  { value: 'sales_employee', label: 'Sales Employee' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'customer_support', label: 'Customer Support' },
];

export default function AdminEmployees() {
  const { rows, loading, remove, update, refetch } = useAdminTable<Employee>('employees', 'created_at', false);
  const { toast } = useToast();
  const { session, profile } = useAuth();
  const canManage = canManageEmployees(profile?.role);
  const assignableRoles = STAFF_ROLES.filter((r) => canAssignRole(profile?.role, r.value));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, string[]>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [detailRoles, setDetailRoles] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: r }, { data: p }] = await Promise.all([
        supabase.from('branches').select('*').order('name'),
        supabase.from('roles').select('*').order('hierarchy_level', { ascending: true }),
        supabase.from('permissions').select('*').order('module', { ascending: true }).order('name', { ascending: true }),
      ]);
      setBranches((b ?? []) as Branch[]);
      setRoles((r ?? []) as Role[]);
      setPermissions((p ?? []) as Permission[]);
    })();
  }, []);

  // Load employee role assignments
  useEffect(() => {
    if (rows.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from('employee_roles')
        .select('employee_id, role_id, roles!inner(name)')
        .order('employee_id');
      const map: Record<string, string[]> = {};
      for (const er of (data ?? []) as unknown as { employee_id: string; roles: { name: string } }[]) {
        if (!map[er.employee_id]) map[er.employee_id] = [];
        map[er.employee_id].push(er.roles.name);
      }
      setEmployeeRoles(map);
    })();
  }, [rows]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      phone: e.phone ?? '',
      position: e.position ?? '',
      branch_id: e.branch_id ?? '',
      hire_date: e.hire_date ?? '',
      status: e.status,
      role: employeeRoles[e.id]?.[0] ?? 'sales_employee',
      password: '',
    });
    setFormOpen(true);
  };

  const viewDetail = async (e: Employee) => {
    setDetailEmployee(e);
    setDetailLoading(true);
    const { data } = await supabase
      .from('employee_roles')
      .select('role_id, roles!inner(name, description)')
      .eq('employee_id', e.id);
    setDetailRoles((data ?? []).map((r: unknown) => (r as { roles: { name: string } }).roles.name));
    setDetailLoading(false);
  };

  const assignRole = async (employeeId: string, roleName: string) => {
    const role = roles.find((r) => r.name === roleName);
    if (!role) return;
    const { error } = await supabase.from('employee_roles').insert({
      employee_id: employeeId,
      role_id: role.id,
    });
    if (error) {
      if (error.code === '23505') toast('Role already assigned', 'info');
      else toast(error.message, 'error');
    } else {
      toast(`Role "${roleName}" assigned`, 'success');
      setDetailRoles((prev) => [...prev, roleName]);
    }
  };

  const removeRole = async (employeeId: string, roleName: string) => {
    const role = roles.find((r) => r.name === roleName);
    if (!role) return;
    const { error } = await supabase
      .from('employee_roles')
      .delete()
      .eq('employee_id', employeeId)
      .eq('role_id', role.id);
    if (error) toast(error.message, 'error');
    else {
      toast(`Role "${roleName}" removed`, 'info');
      setDetailRoles((prev) => prev.filter((r) => r !== roleName));
    }
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast('First name, last name and email are required', 'error');
      return;
    }
    if (!editing && !form.password.trim()) {
      toast('Password is required for new employee accounts', 'error');
      return;
    }
    if (!editing && form.password.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    if (!canAssignRole(profile?.role, form.role)) {
      toast('You are not authorized to assign that role', 'error');
      return;
    }
    setSaving(true);

    if (editing) {
      // Update existing employee record
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        position: form.position.trim() || null,
        branch_id: form.branch_id || null,
        hire_date: form.hire_date || null,
        status: form.status,
      };
      const { error } = await update(editing.id, payload);
      if (error) {
        toast(error, 'error');
        setSaving(false);
        return;
      }
      // Update role assignment
      const currentRoles = employeeRoles[editing.id] ?? [];
      if (form.role && !currentRoles.includes(form.role)) {
        // Remove old roles and assign new one
        for (const oldRole of currentRoles) {
          await removeRole(editing.id, oldRole);
        }
        await assignRole(editing.id, form.role);
      }
      toast('Employee updated', 'success');
      setFormOpen(false);
    } else {
      // Create new employee account via edge function
      try {
        const { data, error } = await supabase.functions.invoke('admin-create-employee', {
          body: {
            email: form.email.trim(),
            password: form.password,
            full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
            role: form.role,
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            phone: form.phone.trim(),
            position: form.position.trim(),
            branch_id: form.branch_id || null,
            hire_date: form.hire_date || null,
            status: form.status,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast('Employee account created — they can now sign in at /admin/login', 'success');
        setFormOpen(false);
        refetch();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to create employee account', 'error');
      }
    }
    setSaving(false);
  };

  const handleDelete = async (e: Employee) => {
    // Remove employee record (the auth user remains — admin can disable via profile status)
    const { error } = await remove(e.id);
    if (error) toast(error, 'error');
    else toast('Employee record removed', 'info');
  };

  return (
    <div>
      <AdminPageHeader
        title="Employees"
        subtitle={`${rows.length} team members`}
        action={canManage ? (
  <Button onClick={openAdd}><Plus className="w-4 h-4" /> Create Employee Account</Button>
) : undefined}
      />

      <DataTable<Employee>
        loading={loading}
        rows={rows}
        columns={[
          {
            key: 'name', label: 'Name',
            render: (e) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gold-500/15 text-gold-300 flex items-center justify-center text-sm font-bold">
                  {e.first_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-ink-100">{e.first_name} {e.last_name}</p>
                  <p className="text-xs text-ink-500">{e.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'roles', label: 'Roles',
            render: (e) => (
              <div className="flex flex-wrap gap-1">
                {(employeeRoles[e.id] ?? []).map((r) => (
                  <Badge key={r} color="gold">{r.replace(/_/g, ' ')}</Badge>
                ))}
                {(!employeeRoles[e.id] || employeeRoles[e.id].length === 0) && (
                  <span className="text-ink-500 text-xs">No role assigned</span>
                )}
              </div>
            ),
          },
          { key: 'position', label: 'Position', render: (e) => <span className="text-ink-300">{e.position ?? '—'}</span> },
          { key: 'branch', label: 'Branch', render: (e) => {
            const b = branches.find((br) => br.id === e.branch_id);
            return <span className="text-ink-300 text-xs">{b?.name ?? '—'}</span>;
          }},
          { key: 'status', label: 'Status', render: (e) => <Badge color={e.status === 'active' ? 'success' : 'neutral'}>{e.status}</Badge> },
          {
      key: 'actions',
      label: '',
      render: (e) => (
        <div className="flex gap-2">
          <button onClick={() => viewDetail(e)} className="text-ink-400 hover:text-gold-300" title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit(e)} className="text-ink-400 hover:text-gold-300"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(e)} className="text-ink-400 hover:text-error-500"><Trash className="w-4 h-4" /></button>
        </div>
      ),
    },
        ]}
      />

      {/* Add/Edit Employee Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Employee' : 'Create Employee Account'} size="md">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          {!editing && (
            <div className="glass rounded-xl p-3 text-xs text-ink-400 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span>
                This creates a new staff account with login credentials. The employee will be able to sign in at <span className="text-gold-300 font-mono">/admin/login</span>.
                They cannot self-register — only authorized admins can create employee accounts.
              </span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} hint={editing ? 'Email cannot be changed after account creation' : undefined} />
          {!editing && (
            <Input label="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Min 6 characters — employee will be prompted to change on first login" />
          )}
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {assignableRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <p className="text-xs text-ink-400 -mt-2">
            Assign the employee's access level — they cannot change this themselves. You can only assign roles below your own access level.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Sales Associate" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Branch" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">— Unassigned —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Input label="Hire Date" type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </Select>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee Account'}
          </Button>
        </div>
      </Modal>

      {/* Role & Permission Management Modal */}
      <Modal open={!!detailEmployee} onClose={() => setDetailEmployee(null)} title={`Roles & Permissions — ${detailEmployee?.first_name ?? ''} ${detailEmployee?.last_name ?? ''}`} size="lg">
        {detailEmployee && (
          <div className="space-y-5">
            {/* Current roles */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gold-400" /> Assigned Roles
              </h4>
              {detailLoading ? (
                <Skeleton className="h-16" />
              ) : detailRoles.length === 0 ? (
                <p className="text-ink-400 text-sm">No roles assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {detailRoles.map((r) => {
                    const role = roles.find((rr) => rr.name === r);
                    return (
                      <div key={r} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-ink-100 capitalize">{r.replace(/_/g, ' ')}</p>
                          {role?.description && <p className="text-xs text-ink-400">{role.description}</p>}
                        </div>
                        {canAssignRole(profile?.role, r) && (
                          <button
                            onClick={() => removeRole(detailEmployee.id, r)}
                            className="text-ink-400 hover:text-error-500 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add role */}
            <div>
              <label className="label">Assign Additional Role</label>
              <Select
                value=""
                onChange={(e) => { if (e.target.value) assignRole(detailEmployee.id, e.target.value); }}
              >
                <option value="">— Select a role to assign —</option>
                {roles
                  .filter((r) => r.name !== 'customer' && !detailRoles.includes(r.name))
                  .map((r) => <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>)}
              </Select>
            </div>

            {/* Permissions summary */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-3 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gold-400" /> Permissions Summary
              </h4>
              <p className="text-xs text-ink-400 mb-3">
                Permissions are inherited from assigned roles. The employee cannot modify their own permissions.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
                {permissions.map((p) => {
                  // Check if any of the employee's roles grant this permission
                  const hasPerm = detailRoles.some((roleName) => {
                    const role = roles.find((r) => r.name === roleName);
                    return role && rolePermissionsForRole(role, permissions).includes(p.name);
                  });
                  return (
                    <div
                      key={p.id}
                      className={`glass rounded-lg px-3 py-2 flex items-center gap-2 ${hasPerm ? 'border-gold-500/20' : 'opacity-50'}`}
                    >
                      {hasPerm ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-400 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-ink-600 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-mono text-ink-200">{p.name}</p>
                        <p className="text-[10px] text-ink-500">{p.module}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Helper to get permissions for a role (would need role_permissions loaded)
// For now, this is a simplified view — the actual permission check happens server-side
function rolePermissionsForRole(_role: Role, _permissions: Permission[]): string[] {
  // This is a placeholder — the actual permissions are managed via the role_permissions table
  // The frontend display is informational; the real enforcement is server-side via has_permission()
  return [];
}