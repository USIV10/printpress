import React, { useState, useEffect } from 'react';
import { PageHeader, Card, CardHead, Button, FormGroup } from '../components/UI';
import s from './UserManagement.module.css';

const emptyForm = () => ({ name: '', username: '', password: '', role: 'sales' });

export default function UserManagement({ currentUser }) {
  const [users, setUsers]       = useState([]);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [changePw, setChangePw] = useState(null); // { id, old:'', new:'', confirm:'' }

  const load = async () => {
    if (window.api) setUsers(await window.api.auth.getUsers());
    else setUsers([
      { id: 1, name: 'Administrator', username: 'admin', role: 'admin', created_at: '2025-01-01' },
      { id: 2, name: 'Sales Staff',   username: 'sales', role: 'sales', created_at: '2025-01-01' },
    ]);
  };

  useEffect(() => { load(); }, []);

  const flash = (msg, isError = false) => {
    isError ? setError(msg) : setSuccess(msg);
    setTimeout(() => isError ? setError('') : setSuccess(''), 3000);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password)
      return flash('All fields are required.', true);
    if (form.password.length < 6)
      return flash('Password must be at least 6 characters.', true);
    setSaving(true);
    const res = window.api
      ? await window.api.auth.createUser(form)
      : { success: true };
    setSaving(false);
    if (!res.success) return flash(res.message, true);
    setForm(emptyForm());
    flash('User created successfully.');
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const res = window.api ? await window.api.auth.deleteUser(id) : { success: true };
    if (!res.success) return flash(res.message, true);
    flash('User deleted.');
    load();
  };

  const handleChangePw = async () => {
    if (!changePw.old || !changePw.new || !changePw.confirm)
      return flash('All password fields are required.', true);
    if (changePw.new !== changePw.confirm)
      return flash('New passwords do not match.', true);
    if (changePw.new.length < 6)
      return flash('New password must be at least 6 characters.', true);
    const res = window.api
      ? await window.api.auth.changePassword({ id: changePw.id, oldPassword: changePw.old, newPassword: changePw.new })
      : { success: true };
    if (!res.success) return flash(res.message, true);
    setChangePw(null);
    flash('Password changed successfully.');
  };

  const roleTag = (role) => (
    <span className={`${s.roleTag} ${role === 'admin' ? s.admin : s.sales}`}>{role}</span>
  );

  return (
    <div className={s.page}>
      <PageHeader title="User management" />

      {(error || success) && (
        <div className={error ? s.flashError : s.flashSuccess}>
          {error || success}
        </div>
      )}

      {/* Create user */}
      <Card>
        <CardHead>Add new user</CardHead>
        <div className={s.grid}>
          <FormGroup label="Full name">
            <input value={form.name} onChange={set('name')} placeholder="e.g. Kwame Asante" />
          </FormGroup>
          <FormGroup label="Username">
            <input value={form.username} onChange={set('username')} placeholder="e.g. kwame" />
          </FormGroup>
          <FormGroup label="Password">
            <div className={s.pwWrap}>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 6 characters"
                style={{ paddingRight: 38 }}
              />
              <button type="button" className={s.pwEye} onClick={() => setShowPw(v => !v)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Role">
            <select value={form.role} onChange={set('role')}>
              <option value="sales">Sales personnel</option>
              <option value="admin">Admin</option>
            </select>
          </FormGroup>
        </div>
        <div className={s.btnRow}>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </Card>

      {/* Users list */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 0' }}><CardHead>All users ({users.length})</CardHead></div>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.id === currentUser.id ? s.currentRow : ''}>
                <td className={s.bold}>
                  {u.name}
                  {u.id === currentUser.id && <span className={s.youTag}>you</span>}
                </td>
                <td className={s.mono}>{u.username}</td>
                <td>{roleTag(u.role)}</td>
                <td className={s.dim}>{u.created_at?.split('T')[0] || u.created_at}</td>
                <td>
                  <div className={s.actions}>
                    <button
                      className={s.actionBtn}
                      onClick={() => setChangePw({ id: u.id, name: u.name, old: '', new: '', confirm: '' })}
                    >
                      Change password
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        className={`${s.actionBtn} ${s.danger}`}
                        onClick={() => handleDelete(u.id, u.name)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Change password modal */}
      {changePw && (
        <div className={s.modalOverlay} onClick={() => setChangePw(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <h3>Change password</h3>
              <span className={s.modalSub}>for {changePw.name}</span>
            </div>
            <div className={s.modalBody}>
              <FormGroup label="Current password">
                <input type="password" value={changePw.old}
                  onChange={e => setChangePw(p => ({ ...p, old: e.target.value }))}
                  placeholder="Current password" />
              </FormGroup>
              <FormGroup label="New password">
                <input type="password" value={changePw.new}
                  onChange={e => setChangePw(p => ({ ...p, new: e.target.value }))}
                  placeholder="Min. 6 characters" />
              </FormGroup>
              <FormGroup label="Confirm new password">
                <input type="password" value={changePw.confirm}
                  onChange={e => setChangePw(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password" />
              </FormGroup>
            </div>
            <div className={s.modalFoot}>
              <Button onClick={() => setChangePw(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleChangePw}>Save password</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
