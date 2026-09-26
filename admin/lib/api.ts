// Central API base URL - reads from env or defaults to localhost:8000
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const ROLES = [
  'citizen',
  'student',
  'university_admin',
  'company',
  'government_officer',
] as const

export type UserRole = (typeof ROLES)[number]

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  phone: string | null
  institution_id: number | null
  created_at: string
}

export interface PaginatedUsers {
  total: number
  page: number
  page_size: number
  total_pages: number
  users: User[]
}

// ── Token helpers (client-side only, stored in localStorage) ─────────────────

const TOKEN_KEY = 'sa_token'

export function saveToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem(TOKEN_KEY)
  return null
}

export function removeToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
}

// ── Authenticated fetch wrapper ───────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as unknown as T
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail ?? `HTTP ${res.status}`)
  return data as T
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function loginSuperAdmin(email: string, password: string) {
  const data = await apiFetch<{ access_token: string; token_type: string }>(
    '/api/super-admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  )
  saveToken(data.access_token)
  return data
}

// ── Users CRUD ────────────────────────────────────────────────────────────────

export interface ListUsersParams {
  search?: string
  role?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export async function listUsers(params: ListUsersParams = {}): Promise<PaginatedUsers> {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.role) qs.set('role', params.role)
  if (params.sort_by) qs.set('sort_by', params.sort_by)
  if (params.sort_order) qs.set('sort_order', params.sort_order)
  if (params.page) qs.set('page', String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  return apiFetch<PaginatedUsers>(`/api/super-admin/users?${qs}`)
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  institution_id?: number
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return apiFetch<User>('/api/super-admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  password?: string
  role?: UserRole
  phone?: string
  institution_id?: number
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  return apiFetch<User>(`/api/super-admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(`/api/super-admin/users/${id}`, { method: 'DELETE' })
}
