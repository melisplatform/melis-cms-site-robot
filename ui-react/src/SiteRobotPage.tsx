import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchDomains, fetchRobotStats, fetchSites, fetchDomainById, saveRobot, deleteRobot,
  markRobotListStale, consumeRobotListStale,
  type DomainItem, type RobotStats, type SiteOption,
} from './site-robot-api'
import { ExportModal, DownloadIcon } from './ExportModal'
import { ViewToggle } from './ViewToggle'

/* ──────────────────────────────────────────────────────────────────────────
 * Brique « Robots » (MelisCmsSiteRobot) — full React, montée à /melis-cms/site-robot
 * (+ /melis-cms/site-robot/:id pour l'éditeur). La LISTE = les DOMAINES de sites ; chacun
 * a un robots.txt optionnel qu'on ÉDITE (pas de création/suppression de domaine — ils viennent
 * des Sites). « Supprimer » efface le robots.txt du domaine. La brique ne peut PAS importer les
 * modules de l'hôte : styles inline + variables CSS du thème, mini-dico FR/EN via <html lang>.
 * ────────────────────────────────────────────────────────────────────────── */

const MELIS_KEY = 'site_robot_tool_display' // zone rendable legacy (vue « Old » en iframe) + garde de droits

// Capacités : lit window.MelisCan (default-allow ; l'API reste gardée côté serveur).
function can(cap: string): boolean {
  return (window as unknown as { MelisCan?: (k: string, c: string) => boolean }).MelisCan?.(MELIS_KEY, cap) ?? true
}

// API sous-onglets de l'hôte (manifest subTabs:true) — sinon l'édition ouvrirait un onglet top-level « id ».
type SubTabW = {
  __melisOpenSubTab?: (section: string, tab: { id: string; label: string; path: string }) => void
  __melisUpdateSubTabLabel?: (section: string, id: string, label: string) => void
}

// ── i18n minimal ──
type Lang = 'fr' | 'en'
function currentLang(): Lang {
  const l = (document.documentElement.lang || 'en').toLowerCase()
  return l.startsWith('fr') ? 'fr' : 'en'
}
const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Robots', subtitle: 'Fichier robots.txt par domaine de site',
    search: 'Rechercher un domaine…', empty: 'Aucun domaine trouvé', count: '{n} domaines — fin de la liste',
    kpi_total: 'Domaines', kpi_with: 'Avec robots.txt', kpi_without: 'Sans robots.txt',
    all_sites: 'Tous les sites',
    col_id: 'ID', col_domain: 'Domaine', col_site: 'Site', col_env: 'Env.', col_robots: 'robots.txt',
    robots_yes: 'Défini', robots_no: 'Aucun',
    columns: 'Colonnes', export: 'Exporter', cols_visible: 'Visibles', cols_hidden: 'Masquées', drag_here: 'Glisser ici', reset: 'Réinitialiser',
    reset_filters: 'Réinitialiser les filtres',
    edit: 'Éditer le robots.txt', del: 'Effacer le robots.txt', cancel: 'Annuler', save: 'Enregistrer', back: 'retour',
    refresh: 'Rafraîchir', loading: 'Chargement…', saved: 'Enregistré ✓',
    del_title: 'Effacer le robots.txt', del_confirm: 'Effacer le robots.txt du domaine « {n} » ? Le domaine n’est pas supprimé.',
    edit_title: 'robots.txt — {n}',
    f_domain: 'Domaine', f_site: 'Site', f_robot: 'Contenu du robots.txt',
    f_robot_hint: 'Le contenu servi à /robots.txt pour ce domaine. Laisser vide pour ne rien servir.',
    f_robot_ph: 'User-agent: *\nDisallow:',
    export_filename: 'domaines-robots', err_save: 'Erreur lors de la sauvegarde',
    no_access: 'Vous n’avez pas les droits pour consulter cette liste.',
  },
  en: {
    title: 'Robots', subtitle: 'Per-domain robots.txt file',
    search: 'Search a domain…', empty: 'No domain found', count: '{n} domains — end of list',
    kpi_total: 'Domains', kpi_with: 'With robots.txt', kpi_without: 'Without robots.txt',
    all_sites: 'All sites',
    col_id: 'ID', col_domain: 'Domain', col_site: 'Site', col_env: 'Env.', col_robots: 'robots.txt',
    robots_yes: 'Set', robots_no: 'None',
    columns: 'Columns', export: 'Export', cols_visible: 'Visible', cols_hidden: 'Hidden', drag_here: 'Drag here', reset: 'Reset',
    reset_filters: 'Reset filters',
    edit: 'Edit robots.txt', del: 'Clear robots.txt', cancel: 'Cancel', save: 'Save', back: 'back',
    refresh: 'Refresh', loading: 'Loading…', saved: 'Saved ✓',
    del_title: 'Clear robots.txt', del_confirm: 'Clear the robots.txt of domain “{n}”? The domain itself is not deleted.',
    edit_title: 'robots.txt — {n}',
    f_domain: 'Domain', f_site: 'Site', f_robot: 'robots.txt content',
    f_robot_hint: 'The content served at /robots.txt for this domain. Leave empty to serve nothing.',
    f_robot_ph: 'User-agent: *\nDisallow:',
    export_filename: 'domain-robots', err_save: 'Error while saving',
    no_access: 'You do not have permission to view this list.',
  },
}
function useT() {
  const lang = currentLang()
  return (key: string, vars?: Record<string, string | number>) => {
    let s = DICT[lang][key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}
function notify(kind: 'ok' | 'ko', title: string, message: string) {
  window.postMessage({ __melisNotif: true, kind, title, message }, '*')
}

// ── Styles (variables CSS du thème de l'hôte) ──
const card: CSSProperties = { border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,.04)' }
const inputCss: CSSProperties = { height: 40, width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--color-input,var(--color-border))', background: 'var(--color-card)', color: 'var(--color-foreground)', padding: '0 12px', fontSize: 14, outline: 'none' }
const btnPrimary: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', borderRadius: 8, border: 0, background: 'var(--color-primary)', color: 'var(--color-primary-foreground,#fff)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
const btnGhost: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-foreground)', fontSize: 14, cursor: 'pointer' }
const iconBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 0, background: 'transparent', color: 'var(--color-muted-foreground)', cursor: 'pointer' }
const th: CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--color-muted-foreground)', whiteSpace: 'nowrap' }
const td: CSSProperties = { padding: '10px 16px', fontSize: 14, color: 'var(--color-foreground)', borderTop: '1px solid var(--color-border)' }
const label: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--color-foreground)' }
const hint: CSSProperties = { marginTop: 4, fontSize: 12, color: 'var(--color-muted-foreground)' }

const sIcon = { width: 15, height: 15, flexShrink: 0 } as const
const PencilIcon = () => <svg style={sIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
const TrashIcon = () => <svg style={sIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
const GripIcon = () => <svg style={{ width: 13, height: 13, flexShrink: 0, color: 'var(--color-muted-foreground)' }} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
const ResetIcon = () => <svg style={sIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>

// ── Colonnes (masquer + réordonner, persisté) ──
type ColDef = { id: string; visible: boolean }
const COL_ORDER = ['id', 'domain', 'site', 'env', 'robots'] as const
const COL_LABEL: Record<string, string> = { id: 'col_id', domain: 'col_domain', site: 'col_site', env: 'col_env', robots: 'col_robots' }
const DEFAULT_COLS: ColDef[] = COL_ORDER.map((id) => ({ id, visible: id !== 'id' }))
const COL_KEY = 'melis-site-robot-cols-v1'
function loadCols(): ColDef[] {
  try {
    const raw = localStorage.getItem(COL_KEY)
    if (!raw) return DEFAULT_COLS
    const saved: ColDef[] = JSON.parse(raw)
    const ordered = saved.map((s) => { const d = DEFAULT_COLS.find((c) => c.id === s.id); return d ? { id: d.id, visible: s.visible } : null }).filter(Boolean) as ColDef[]
    const missing = DEFAULT_COLS.filter((d) => !saved.find((s) => s.id === d.id))
    return [...ordered, ...missing]
  } catch { return DEFAULT_COLS }
}
function saveCols(c: ColDef[]) { try { localStorage.setItem(COL_KEY, JSON.stringify(c)) } catch { /* */ } }
const visibleCols = (c: ColDef[]) => c.filter((x) => x.visible)

const panelCss: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minHeight: 130, borderRadius: 8, border: '1px dashed var(--color-border)', padding: 6 }
const panelTitle: CSSProperties = { padding: '0 6px 4px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-muted-foreground)' }

function ColManager({ cols, labelFor, onChange, onClose }: {
  cols: ColDef[]; labelFor: (id: string) => string; onChange: (c: ColDef[]) => void; onClose: () => void
}) {
  const t = useT()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; panel: 'visible' | 'hidden' } | null>(null)
  const shown = cols.filter((c) => c.visible)
  const hidden = cols.filter((c) => !c.visible)

  function drop(panel: 'visible' | 'hidden') {
    if (!dragId) return
    const src = cols.find((c) => c.id === dragId)!
    const upd = { ...src, visible: panel === 'visible' }
    let vList = shown.filter((c) => c.id !== dragId)
    const hList = hidden.filter((c) => c.id !== dragId)
    if (panel === 'visible') {
      const dst = over?.id
      if (!dst || dst === '__panel__') vList = [...vList, upd]
      else { const i = vList.findIndex((c) => c.id === dst); vList = i === -1 ? [...vList, upd] : [...vList.slice(0, i), upd, ...vList.slice(i)] }
      const next = [...vList, ...hList]; onChange(next); saveCols(next)
    } else { const next = [...vList, ...hList, upd]; onChange(next); saveCols(next) }
    setDragId(null); setOver(null)
  }

  function item(col: ColDef, panel: 'visible' | 'hidden') {
    const isOver = over?.id === col.id && over?.panel === panel
    return (
      <div key={col.id} draggable
        onDragStart={() => setDragId(col.id)}
        onDragEnd={() => { setDragId(null); setOver(null) }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (over?.id !== col.id || over?.panel !== panel) setOver({ id: col.id, panel }) }}
        onDrop={(e) => { e.preventDefault(); drop(panel) }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '6px 8px', fontSize: 14, cursor: 'grab', userSelect: 'none', opacity: dragId === col.id ? 0.4 : 1, background: isOver ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent' }}>
        <GripIcon /><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFor(col.id)}</span>
      </div>
    )
  }

  return (
    <div style={{ ...card, position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 50, width: 380, maxWidth: 'calc(100vw - 1rem)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t('columns')}</span>
        <button style={{ ...iconBtn, width: 22, height: 22 }} onClick={onClose}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
        <div style={panelCss}
          onDragOver={(e) => { e.preventDefault(); if (over?.id !== '__panel__' || over?.panel !== 'hidden') setOver({ id: '__panel__', panel: 'hidden' }) }}
          onDrop={(e) => { e.preventDefault(); drop('hidden') }}>
          <p style={panelTitle}>{t('cols_hidden')}</p>
          {hidden.length === 0 ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-muted-foreground)', opacity: 0.5, padding: '16px 0' }}>{t('drag_here')}</div> : hidden.map((c) => item(c, 'hidden'))}
        </div>
        <div style={panelCss}
          onDragOver={(e) => { e.preventDefault(); if (over?.id !== '__panel__' || over?.panel !== 'visible') setOver({ id: '__panel__', panel: 'visible' }) }}
          onDrop={(e) => { e.preventDefault(); drop('visible') }}>
          <p style={panelTitle}>{t('cols_visible')}</p>
          {shown.length === 0 ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-muted-foreground)', opacity: 0.5, padding: '16px 0' }}>{t('drag_here')}</div> : shown.map((c) => item(c, 'visible'))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)', padding: 6 }}>
        <button style={{ ...btnGhost, width: '100%', height: 30, border: 0, justifyContent: 'center', color: 'var(--color-muted-foreground)' }}
          onClick={() => { onChange(DEFAULT_COLS); saveCols(DEFAULT_COLS) }}>{t('reset')}</button>
      </div>
    </div>
  )
}

function Kpi({ label: lbl, value }: { label: string; value: number | null }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 2, padding: 16, flex: 1, minWidth: 140 }}>
      <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{lbl}</span>
      <span style={{ fontSize: 22, fontWeight: 700 }}>{value == null ? '…' : value}</span>
    </div>
  )
}

function RobotsBadge({ has, labelOn, labelOff }: { has: boolean; labelOn: string; labelOff: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
      background: has ? 'color-mix(in srgb, #10b981 14%, transparent)' : 'var(--color-muted,rgba(0,0,0,.06))',
      color: has ? '#059669' : 'var(--color-muted-foreground)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: has ? '#10b981' : 'var(--color-muted-foreground)' }} />
      {has ? labelOn : labelOff}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Brique persistante (manifest) : reste montée au changement d'onglet → geler le route quand inactive.
export default function SiteRobotPage({ active = true }: { active?: boolean }) {
  const { id } = useParams()
  const location = useLocation()
  const [frozen, setFrozen] = useState({ id, pathname: location.pathname })
  useEffect(() => { if (active) setFrozen({ id, pathname: location.pathname }) }, [active, id, location.pathname])
  const effId = active ? id : frozen.id
  const effPath = active ? location.pathname : frozen.pathname
  const base = effId ? effPath.slice(0, effPath.length - effId.length - 1) : effPath

  if (effId) return <RobotForm id={effId} base={base} />
  return <DomainList base={base} />
}

// ── Liste des domaines ────────────────────────────────────────────────────────
function DomainList({ base }: { base: string }) {
  const t = useT()
  const navigate = useNavigate()
  const [items, setItems] = useState<DomainItem[]>([])
  const [stats, setStats] = useState<RobotStats | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [site, setSite] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(false)
  const [toDelete, setToDelete] = useState<DomainItem | null>(null)
  const [tick, setTick] = useState(0)
  const [cols, setCols] = useState<ColDef[]>(loadCols)
  const [showCols, setShowCols] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [mode, setMode] = useState<'react' | 'iframe'>('react')
  const [frameLoaded, setFrameLoaded] = useState(false)

  useEffect(() => { fetchRobotStats().then(setStats).catch(() => null) }, [tick])
  useEffect(() => { fetchSites().then(setSites).catch(() => null) }, [])
  useEffect(() => {
    setLoading(true)
    fetchDomains({ search, site }).then((r) => setItems(r.items)).catch(() => null).finally(() => setLoading(false))
  }, [search, site, tick])
  // Rafraîchir au retour du formulaire (liste persistante).
  useEffect(() => { if (consumeRobotListStale()) setTick((x) => x + 1) }, [])

  const sorted = useMemo(() => [...items].sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id)), [items, sortAsc])

  // Réinitialise recherche + site + tri par défaut, puis recharge. `setItems([])` est obligatoire :
  // sans ça les anciennes lignes restent affichées et le clic paraît sans effet.
  // `tick` est bumpé pour forcer le refetch même quand aucun filtre n'était posé.
  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setSite(null)
    setSortAsc(false)
    setItems([])
    setTick((x) => x + 1)
  }

  async function confirmDelete() {
    if (!toDelete) return
    try { await deleteRobot(toDelete.id); setToDelete(null); setTick((x) => x + 1) }
    catch { setToDelete(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t('title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '2px 0 0' }}>{t('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ViewToggle mode={mode} onChange={(m) => { setMode(m); if (m === 'iframe') setFrameLoaded(true) }} />
          <button style={btnGhost} onClick={() => setTick((x) => x + 1)} title={t('refresh')}>↻</button>
        </div>
      </div>

      {/* Vue « Old » : outil legacy en iframe */}
      {frameLoaded && (
        <div style={{ ...card, display: mode === 'iframe' ? 'flex' : 'none', flex: 1, minHeight: 480, overflow: 'hidden' }}>
          <iframe src={`/melis/react-tool-page?key=${encodeURIComponent(MELIS_KEY)}`}
            style={{ flex: 1, width: '100%', border: 0 }} title="Robots — Vue Melis"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" />
        </div>
      )}

      {/* Vue « New » */}
      <div style={{ display: mode === 'react' ? 'flex' : 'none', flexDirection: 'column', gap: 20 }}>
      {!can('list') ? (
        <div style={{ ...card, padding: '40px 16px', textAlign: 'center', fontSize: 14, color: 'var(--color-muted-foreground)' }}>{t('no_access')}</div>
      ) : (<>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Kpi label={t('kpi_total')} value={stats?.total ?? null} />
          <Kpi label={t('kpi_with')} value={stats?.withRobots ?? null} />
          <Kpi label={t('kpi_without')} value={stats?.withoutRobots ?? null} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inputCss, height: 36, flex: 1, minWidth: 220 }} value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
            placeholder={t('search')} />
          <select style={{ ...inputCss, height: 36, width: 'auto' }} value={site ?? ''} onChange={(e) => setSite(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t('all_sites')}</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button style={{ ...btnGhost, height: 36 }} onClick={resetFilters}><ResetIcon />{t('reset_filters')}</button>
          <div style={{ position: 'relative' }}>
            <button style={{ ...btnGhost, height: 36 }} onClick={() => setShowCols((v) => !v)}><GripIcon />{t('columns')}</button>
            {showCols && <ColManager cols={cols} labelFor={(id) => t(COL_LABEL[id])} onChange={setCols} onClose={() => setShowCols(false)} />}
          </div>
          {can('export') && <button style={{ ...btnGhost, height: 36 }} onClick={() => setShowExport(true)}><DownloadIcon />{t('export')}</button>}
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead style={{ background: 'var(--color-muted,rgba(0,0,0,.03))' }}>
              <tr>
                {visibleCols(cols).map(({ id }) => (
                  <th key={id} style={{ ...th, ...(id === 'id' ? { cursor: 'pointer', width: 70 } : {}), ...(id === 'robots' ? { width: 120 } : {}) }}
                    onClick={id === 'id' ? () => setSortAsc((v) => !v) : undefined}>
                    {t(COL_LABEL[id])}{id === 'id' ? ` ${sortAsc ? '↑' : '↓'}` : ''}
                  </th>
                ))}
                <th style={{ ...th, width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading ? (
                <tr><td style={{ ...td, textAlign: 'center', color: 'var(--color-muted-foreground)', padding: '40px 16px' }} colSpan={visibleCols(cols).length + 1}>{t('empty')}</td></tr>
              ) : sorted.map((r) => (
                <tr key={r.id}>
                  {visibleCols(cols).map(({ id }) => (
                    <td key={id} style={{ ...td, ...(id === 'id' ? { color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' } : {}), ...(id === 'domain' ? { fontFamily: 'monospace', fontSize: 13 } : {}) }}>
                      {id === 'id' && r.id}
                      {id === 'domain' && (
                        <button onClick={() => navigate(`${base}/${r.id}`)}
                          style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--color-foreground)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                          {r.scheme ? `${r.scheme}://${r.domain}` : r.domain}
                        </button>
                      )}
                      {id === 'site' && <span style={{ fontWeight: 500 }}>{r.siteName}</span>}
                      {id === 'env' && <span style={{ color: 'var(--color-muted-foreground)' }}>{r.env}</span>}
                      {id === 'robots' && <RobotsBadge has={r.hasRobots} labelOn={t('robots_yes')} labelOff={t('robots_no')} />}
                    </td>
                  ))}
                  <td style={td}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      {can('edit') && <button style={iconBtn} title={t('edit')} onClick={() => navigate(`${base}/${r.id}`)}><PencilIcon /></button>}
                      {can('delete') && r.hasRobots && <button style={{ ...iconBtn, color: 'var(--color-destructive,#ef4444)' }} title={t('del')} onClick={() => setToDelete(r)}><TrashIcon /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, color: 'var(--color-muted-foreground)' }}>
            {loading ? t('loading') : t('count', { n: items.length })}
          </div>
        </div>
      </>)}
      </div>

      {toDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)' }}>
          <div style={{ ...card, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{t('del_title')}</h3>
            <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', marginTop: 8 }}>{t('del_confirm', { n: toDelete.domain })}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnGhost} onClick={() => setToDelete(null)}>{t('cancel')}</button>
              <button style={{ ...btnGhost, borderColor: '#fca5a5', color: '#dc2626' }} onClick={confirmDelete}>{t('del')}</button>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportModal<DomainItem>
          cols={cols}
          labelFor={(id) => t(COL_LABEL[id])}
          fetchAll={async () => (await fetchDomains({ search, site, limit: 9999 })).items}
          getCell={(r, id) => id === 'id' ? r.id : id === 'domain' ? r.domain : id === 'site' ? r.siteName : id === 'env' ? r.env : id === 'robots' ? (r.hasRobots ? t('robots_yes') : t('robots_no')) : ''}
          filename={t('export_filename')} sheetName={t('title')} total={items.length}
          onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}

// ── Formulaire : édition du robots.txt d'un domaine ────────────────────────────
function RobotForm({ id, base }: { id: string; base: string }) {
  const t = useT()
  const navigate = useNavigate()
  const domainId = parseInt(id)

  const [domain, setDomain] = useState('')
  const [siteName, setSiteName] = useState('')
  const [robotText, setRobotText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Sous-onglet nommé (look Users) : ouvert au montage, renommé avec le domaine au chargement.
  const subTabId = `${base}/${id}`
  useEffect(() => {
    ;(window as unknown as SubTabW).__melisOpenSubTab?.(base, { id: subTabId, label: t('loading'), path: subTabId })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (domain) (window as unknown as SubTabW).__melisUpdateSubTabLabel?.(base, subTabId, domain)
  }, [domain]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!can('edit')) navigate(base) }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setLoading(true)
    fetchDomainById(domainId)
      .then((d) => { setDomain(d.domain); setSiteName(d.siteName); setRobotText(d.robotText) })
      .catch(() => navigate(base))
      .finally(() => setLoading(false))
  }, [domainId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    setError(null); setSaving(true)
    try {
      await saveRobot({ id: domainId, robotText })
      setSaved(true)
      markRobotListStale()
      notify('ok', t('title'), t('saved'))
      setTimeout(() => navigate(base), 500)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err_save'))
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t('edit_title', { n: domain || ('#' + id) })}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ fontSize: 14, color: '#059669' }}>{t('saved')}</span>}
          <button style={btnPrimary} onClick={submit} disabled={saving || loading}>{saving ? '…' : t('save')}</button>
        </div>
      </div>

      {error && <div style={{ ...card, borderColor: '#fca5a5', background: '#fef2f2', color: '#b91c1c', padding: '8px 14px', fontSize: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted-foreground)' }}>{t('loading')}</div>
      ) : (
        <div style={{ ...card, padding: 20, maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={label}>{t('f_domain')}</label>
              <input style={{ ...inputCss, fontFamily: 'monospace', opacity: 0.75 }} value={domain} readOnly />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={label}>{t('f_site')}</label>
              <input style={{ ...inputCss, opacity: 0.75 }} value={siteName} readOnly />
            </div>
          </div>
          <div>
            <label style={label}>{t('f_robot')}</label>
            <textarea value={robotText} onChange={(e) => setRobotText(e.target.value)} placeholder={t('f_robot_ph')}
              spellCheck={false}
              style={{ ...inputCss, height: 320, padding: 12, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre' }} />
            <p style={hint}>{t('f_robot_hint')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
