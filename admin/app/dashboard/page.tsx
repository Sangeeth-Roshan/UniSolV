'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  listUsers, createUser, updateUser, deleteUser, removeToken, getToken,
  type User, type UserRole, type ListUsersParams, ROLES,
} from '@/lib/api'

// ── Utility: Role badge colour ─────────────────────────────────────────────
const ROLE_COLOURS: Record<string, string> = {
  citizen: 'bg-blue-100 text-blue-800',
  student: 'bg-purple-100 text-purple-800',
  university_admin: 'bg-amber-100 text-amber-800',
  company: 'bg-teal-100 text-teal-800',
  government_officer: 'bg-green-100 text-green-800',
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_COLOURS[role] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode }
function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── User form (shared by create + edit) ────────────────────────────────────
interface UserFormProps {
  initial?: Partial<User>
  isEdit?: boolean
  onSave: (data: Record<string, string>) => Promise<void>
  onCancel: () => void
  error: string | null
  loading: boolean
}

function UserForm({ initial, isEdit, onSave, onCancel, error, loading }: UserFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? 'citizen',
    phone: initial?.phone ?? '',
  })

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = {
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone,
    }
    if (form.password) payload.password = form.password
    await onSave(payload)
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full Name *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" required />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Email *</label>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" required />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
          <input type="password" className={inputCls} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required={!isEdit} />
        </div>
        <div>
          <label className={labelCls}>Role *</label>
          <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)} required>
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  )
}

// ── Confirm delete dialog ──────────────────────────────────────────────────
interface DeleteConfirmProps {
  user: User
  onConfirm: () => Promise<void>
  onCancel: () => void
  loading: boolean
  error: string | null
}
function DeleteConfirm({ user, onConfirm, onCancel, loading, error }: DeleteConfirmProps) {
  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
      <p className="text-slate-600 text-sm">
        Are you sure you want to delete <span className="font-bold text-slate-900">{user.name}</span> ({user.email})?
        This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors">
          {loading ? 'Deleting…' : 'Yes, Delete'}
        </button>
      </div>
    </div>
  )
}

// ── Sort icon ──────────────────────────────────────────────────────────────
function SortIcon({ col, current, order }: { col: string; current: string; order: 'asc' | 'desc' }) {
  if (col !== current) return <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
  return order === 'asc'
    ? <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
    : <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'delete'; user: User }

export default function DashboardPage() {
  const router = useRouter()

  // Auth guard
  useEffect(() => {
    if (!getToken()) router.replace('/login')
  }, [router])

  // ── State ────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (params: ListUsersParams) => {
    setFetching(true)
    setFetchError(null)
    try {
      const data = await listUsers(params)
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users'
      if (msg.toLowerCase().includes('401') || msg.toLowerCase().includes('unauthorized')) {
        removeToken(); router.replace('/login')
      } else {
        setFetchError(msg)
      }
    } finally {
      setFetching(false)
    }
  }, [router])

  useEffect(() => {
    fetchUsers({ search, role: roleFilter || undefined, sort_by: sortBy, sort_order: sortOrder, page, page_size: PAGE_SIZE })
  }, [fetchUsers, search, roleFilter, sortBy, sortOrder, page])

  // ── Search debounce ──────────────────────────────────────────────────────
  function handleSearchChange(val: string) {
    setSearch(val)
    setPage(1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }

  // ── Sort ────────────────────────────────────────────────────────────────
  function handleSort(col: string) {
    if (col === sortBy) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortOrder('asc')
    }
    setPage(1)
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  function handleLogout() {
    removeToken()
    router.push('/login')
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(data: Record<string, string>) {
    setModalLoading(true)
    setModalError(null)
    try {
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        phone: data.phone || undefined,
      })
      setModal({ type: 'none' })
      fetchUsers({ search, role: roleFilter || undefined, sort_by: sortBy, sort_order: sortOrder, page, page_size: PAGE_SIZE })
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setModalLoading(false)
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async function handleUpdate(userId: number, data: Record<string, string>) {
    setModalLoading(true)
    setModalError(null)
    try {
      const payload: Record<string, string | UserRole> = {}
      if (data.name) payload.name = data.name
      if (data.email) payload.email = data.email
      if (data.password) payload.password = data.password
      if (data.role) payload.role = data.role as UserRole
      if (data.phone !== undefined) payload.phone = data.phone
      await updateUser(userId, payload)
      setModal({ type: 'none' })
      fetchUsers({ search, role: roleFilter || undefined, sort_by: sortBy, sort_order: sortOrder, page, page_size: PAGE_SIZE })
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setModalLoading(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(userId: number) {
    setModalLoading(true)
    setModalError(null)
    try {
      await deleteUser(userId)
      setModal({ type: 'none' })
      // If we deleted the last item on this page, go back one page
      const newPage = users.length === 1 && page > 1 ? page - 1 : page
      setPage(newPage)
      fetchUsers({ search, role: roleFilter || undefined, sort_by: sortBy, sort_order: sortOrder, page: newPage, page_size: PAGE_SIZE })
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setModalLoading(false)
    }
  }

  const SORTABLE_COLS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'created_at', label: 'Joined' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-sm">UniSOLV Admin</span>
            <span className="hidden sm:inline-block text-slate-300">·</span>
            <span className="hidden sm:inline-block text-slate-500 text-sm">User Management</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: total, icon: '👥', colour: 'text-indigo-600' },
            { label: 'This Page', value: users.length, icon: '📄', colour: 'text-slate-600' },
            { label: 'Page', value: `${page} / ${totalPages}`, icon: '📑', colour: 'text-slate-600' },
            { label: 'Roles', value: ROLES.length, icon: '🎭', colour: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            className="py-2.5 pl-3 pr-8 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All Roles</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Create */}
          <button
            onClick={() => { setModal({ type: 'create' }); setModalError(null) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-500/20 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New User
          </button>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {fetchError && (
            <div className="p-6 text-center text-red-600 text-sm">{fetchError}</div>
          )}

          {!fetchError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {SORTABLE_COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.label}
                          <SortIcon col={col.key} current={sortBy} order={sortOrder} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetching ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                        <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">#{user.id}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3.5"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-400 text-xs">
                          {user.phone ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setModal({ type: 'edit', user }); setModalError(null) }}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setModal({ type: 'delete', user }); setModalError(null) }}
                              title="Delete"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {!fetchError && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                {total} total · page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {modal.type === 'create' && (
        <Modal title="Create New User" onClose={() => setModal({ type: 'none' })}>
          <UserForm
            onSave={handleCreate}
            onCancel={() => setModal({ type: 'none' })}
            error={modalError}
            loading={modalLoading}
          />
        </Modal>
      )}

      {modal.type === 'edit' && (
        <Modal title={`Edit User — ${modal.user.name}`} onClose={() => setModal({ type: 'none' })}>
          <UserForm
            initial={modal.user}
            isEdit
            onSave={data => handleUpdate(modal.user.id, data)}
            onCancel={() => setModal({ type: 'none' })}
            error={modalError}
            loading={modalLoading}
          />
        </Modal>
      )}

      {modal.type === 'delete' && (
        <Modal title="Delete User" onClose={() => setModal({ type: 'none' })}>
          <DeleteConfirm
            user={modal.user}
            onConfirm={() => handleDelete(modal.user.id)}
            onCancel={() => setModal({ type: 'none' })}
            loading={modalLoading}
            error={modalError}
          />
        </Modal>
      )}
    </div>
  )
}
