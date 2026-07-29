// Client API typé de la brique « Robots » (robots.txt par domaine). Endpoints sous
// /melis/react-api/site-robots (contrôleur MelisCmsSiteRobot). Réponse : { success, data, error }.

const XHR_HEADER = { 'X-Requested-With': 'XMLHttpRequest' }

async function apiFetch<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
    headers: { ...XHR_HEADER, ...(opts.headers || {}) },
  })
  const txt = await res.text()
  let json: { success?: boolean; data?: T; error?: string } | null = null
  try { json = txt ? JSON.parse(txt) : null } catch { /* non-JSON */ }
  if (!res.ok || !json || json.success === false) {
    throw new Error((json && json.error) || `HTTP ${res.status}`)
  }
  return json.data as T
}

export interface DomainItem {
  id: number
  domain: string
  siteId: number
  siteName: string
  env: string
  scheme: string
  hasRobots: boolean
}
export interface DomainDetail extends DomainItem {
  robotText: string
}
export interface RobotStats { total: number; withRobots: number; withoutRobots: number }
export interface SiteOption { id: number; name: string }
export interface DomainListResult { items: DomainItem[]; total: number; nextCursor: string | null }

export function fetchDomains(params: {
  search?: string; site?: number | null; limit?: number
  sort?: string; dir?: 'asc' | 'desc'; after?: string | null
} = {}): Promise<DomainListResult> {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.site) qs.set('site', String(params.site))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.sort) qs.set('sort', params.sort)
  if (params.dir) qs.set('dir', params.dir)
  if (params.after) qs.set('after', params.after)
  return apiFetch<DomainListResult>(`/melis/react-api/site-robots?${qs}`)
}

export const fetchRobotStats = () => apiFetch<RobotStats>('/melis/react-api/site-robots/stats')
export const fetchSites = () => apiFetch<{ sites: SiteOption[] }>('/melis/react-api/site-robots/sites').then((d) => d.sites)
export const fetchDomainById = (id: number) => apiFetch<DomainDetail>(`/melis/react-api/site-robots/${id}`)

export const saveRobot = (payload: { id: number; robotText: string }) =>
  apiFetch<{ id: number }>('/melis/react-api/site-robots/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })

export const deleteRobot = (id: number) =>
  apiFetch<null>(`/melis/react-api/site-robots/delete/${id}`, { method: 'DELETE' })

// Rafraîchit la liste au retour du formulaire (liste montée en persistance).
let _stale = false
export function markRobotListStale() { _stale = true }
export function consumeRobotListStale() { const s = _stale; _stale = false; return s }
