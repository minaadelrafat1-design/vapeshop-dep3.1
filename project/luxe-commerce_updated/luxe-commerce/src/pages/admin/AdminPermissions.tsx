import { useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { useAdminTable } from '@/hooks/useAdminTable';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/AdminComponents';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import type { Permission } from '@/types';

interface PermissionForm {
  name: string;
  description: string;
  module: string;
}

const emptyForm: PermissionForm = { name: '', description: '', module: 'general' };

export default function AdminPermissions() {
  const { rows, loading, remove, insert, update } = useAdminTable<Permission>('permissions', 'module', true);
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form, setForm] = useState<PermissionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const modules = Array.from(new Set(rows.map((r) => r.module))).sort();

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Permission) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', module: p.module });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.module.trim()) {
      toast('Permission name and module are required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      module: form.module.trim(),
    };
    const { error } = editing ? await update(editing.id, payload) : await insert(payload);
    setSaving(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast(editing ? 'Permission updated' : 'Permission added', 'success');
      setFormOpen(false);
    }
  };

  return (
    <div>
      <AdminPageHeader title="Permissions" subtitle={`${rows.length} permissions across modules`} action={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Permission</Button>} />
      <DataTable<Permission>
        loading={loading}
        rows={rows}
        columns={[
          { key: 'name', label: 'Permission', render: (p) => <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-gold-400" /><span className="font-mono text-sm text-ink-100">{p.name}</span></div> },
          { key: 'description', label: 'Description', render: (p) => <span className="text-ink-300">{p.description ?? '—'}</span> },
          { key: 'module', label: 'Module', render: (p) => <Badge color="gold">{p.module}</Badge> },
          { key: 'actions', label: '', render: (p) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="text-ink-400 hover:text-gold-300"><Pencil className="w-4 h-4" /></button>
              <button onClick={async () => { const { error } = await remove(p.id); if (error) toast(error, 'error'); else toast('Permission deleted', 'info'); }} className="text-ink-400 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ) },
        ]}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Permission' : 'Add Permission'} size="sm">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. products.delete" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Module" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder="e.g. products" list="permission-modules" />
          <datalist id="permission-modules">
            {modules.map((m) => <option key={m} value={m} />)}
          </datalist>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Permission'}</Button>
        </div>
      </Modal>
    </div>
  );
}
