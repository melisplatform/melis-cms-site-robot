import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  fetchDomains, fetchRobotStats, fetchSites, fetchDomainById, saveRobot, deleteRobot,
  markRobotListStale, consumeRobotListStale,
  type DomainItem, type RobotStats, type SiteOption,
} from './site-robot-api'
import { useKeysetList } from './use-keyset-list'
import { ExportModal, DownloadIcon } from './ExportModal'
import { ViewToggle } from './ViewToggle'
import { useIsNarrow } from './shared/useIsNarrow'
import { ExpandToggle, HiddenColsRow } from './shared/ExpandableRow'
import { FormErrorBanner, koNotify, type FormIssue } from './shared/melis-form-errors'
import { useDragReorder } from './shared/use-drag-reorder'

/* ──────────────────────────────────────────────────────────────────────────
 * Brique « Robots » (MelisCmsSiteRobot) — full React, montée à /melis-cms/site-robot
 * (+ /melis-cms/site-robot/:id pour l'éditeur). La LISTE = les DOMAINES de sites ; chacun
 * a un robots.txt optionnel qu'on ÉDITE (pas de création/suppression de domaine — ils viennent
 * des Sites). « Supprimer » efface le robots.txt du domaine. La brique ne peut PAS importer les
 * modules de l'hôte : styles inline + variables CSS du thème, mini-dico FR/EN via <html lang>.
 * ────────────────────────────────────────────────────────────────────────── */

// Renderable legacy zone ("Old" iframe view). Stays the `conf.type` target's melisKey.
const MELIS_KEY = 'site_robot_tool_display'

/** Icône de tri unifiée — mêmes tracés que les icônes lucide ArrowUpDown/ArrowUp/ArrowDown du core. */
function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  const p = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { flexShrink: 0, opacity: dir ? 1 : 0.3 } }
  if (dir === 'asc')  return <svg {...p}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
  if (dir === 'desc') return <svg {...p}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
  return <svg {...p}><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></svg>
}

// Capability key — must match config/react.capabilities.php, i.e. the melisKey of the
// rights-bearing menu node. Distinct from MELIS_KEY above: the zone key is not what rights
// hang on, so using it here would silently default-allow every capability.
const CAPS_KEY = 'meliscms_site_robot_tools_section'

// Capacités : lit window.MelisCan (default-allow ; l'API reste gardée côté serveur).
function can(cap: string): boolean {
  return (window as unknown as { MelisCan?: (k: string, c: string) => boolean }).MelisCan?.(CAPS_KEY, cap) ?? true
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
    title: 'Robots.txt', subtitle: 'Fichier robots.txt par domaine de site',
    view_new: 'Nouveau', view_old: 'Ancien',
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
    err_headline: 'L’enregistrement du robots.txt a échoué.',
    no_access: 'Vous n’avez pas les droits pour consulter cette liste.',
  },
  en: {
    title: 'Robots.txt', subtitle: 'Per-domain robots.txt file',
    view_new: 'New', view_old: 'Old',
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
    err_headline: 'Saving the robots.txt failed.',
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

// ── Icônes des cartes KPI (tracés lucide Globe/FileCheck2/FileX2) ──
const kIcon = { width: 18, height: 18, flexShrink: 0 } as const
const GlobeIcon = () => <svg style={kIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20Z" /><path d="M2 12h20" /></svg>
const FileCheckIcon = () => <svg style={kIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" /><path d="M14 2v6h6" /><path d="m9 15 2 2 4-4" /></svg>
const FileXIcon = () => <svg style={kIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" /><path d="M14 2v6h6" /><path d="m9.5 12.5 5 5" /><path d="m14.5 12.5-5 5" /></svg>

// Mêmes teintes que RobotsBadge (14%/vert-succès, muted/gris) + primary pour le total —
// cohérent avec les cartes KPI existantes (Users, etc.).
const kpiColorPrimary: CSSProperties = { background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
const kpiColorGood: CSSProperties = { background: 'color-mix(in srgb, #10b981 14%, transparent)', color: '#059669' }
const kpiColorMuted: CSSProperties = { background: 'var(--color-muted,rgba(0,0,0,.06))', color: 'var(--color-muted-foreground)' }

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

const panelTitle: CSSProperties = { padding: '0 6px 4px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-muted-foreground)' }

function ColManager({ anchorRef, cols, labelFor, onChange, onClose }: {
  anchorRef: RefObject<HTMLElement | null>; cols: ColDef[]; labelFor: (id: string) => string; onChange: (c: ColDef[]) => void; onClose: () => void
}) {
  const t = useT()
  const narrow = useIsNarrow()
  // Touch-compatible drag (mouse + touch events, not native HTML5 draggable — that API never
  // fires from touch input) — see shared/use-drag-reorder.ts.
  const { draggingId: dragId, overTarget: over, dragPos, startDragMouse, startDragTouch } = useDragReorder({
    cols, onChange: (next) => { onChange(next); saveCols(next) },
  })
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)
  const shown = cols.filter((c) => c.visible)
  const hidden = cols.filter((c) => !c.visible)
  const panelCss: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minHeight: narrow ? 90 : 130, maxHeight: narrow ? 'min(30vh, 200px)' : 'min(48vh, 320px)', overflowY: 'auto', minWidth: 0, borderRadius: 8, border: '1px dashed var(--color-border)', padding: 6 }

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const margin = 8
    const spaceBelow = window.innerHeight - rect.bottom - margin
    const spaceAbove = rect.top - margin
    // Panneau aligné à droite sur l'ancre par défaut, mais avec un `left` CALCULÉ ET BORNÉ pour
    // qu'il ne puisse jamais déborder du bord gauche du viewport : le bord droit de l'ancre n'est
    // pas forcément au ras du vrai bord d'écran (padding de page, bouton devenu demi-ligne d'un
    // flex-wrap sur étroit), donc un ancrage purement par `right` laissait le bord GAUCHE passer
    // en négatif et rognait l'en-tête « Colonnes ». No-op sur desktop (place suffisante).
    const width = Math.min(380, window.innerWidth - margin * 2)
    const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin)
    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      setPos({ top: rect.bottom + 6, left, width, maxHeight: Math.max(160, spaceBelow - 6) })
    } else {
      setPos({ bottom: window.innerHeight - rect.top + 6, left, width, maxHeight: Math.max(160, spaceAbove - 6) })
    }
  }, [anchorRef])

  function item(col: ColDef, panel: 'visible' | 'hidden') {
    const isOver = over?.id === col.id && over?.panel === panel
    return (
      <div key={col.id} data-col-item={col.id} onMouseDown={startDragMouse(col.id)} onTouchStart={startDragTouch(col.id)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '6px 8px', fontSize: 14, cursor: 'grab', userSelect: 'none', touchAction: 'none', opacity: dragId === col.id ? 0.4 : 1, background: isOver ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent' }}>
        <GripIcon /><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFor(col.id)}</span>
      </div>
    )
  }

  if (!pos) return null
  return (
    <>
    <div style={{
      ...card, position: 'fixed', left: pos.left, zIndex: 50, width: pos.width,
      maxHeight: pos.maxHeight, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t('columns')}</span>
        <button style={{ ...iconBtn, width: 22, height: 22 }} onClick={onClose}>✕</button>
      </div>
      {/* Masquées / Visibles côte à côte sur desktop ; empilés sur étroit (à 2 colonnes dans un
          panneau étroit, les libellés sont tronqués et le drag&drop devient aveugle). */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : '1fr 1fr', gap: 8, padding: 12 }}>
        <div data-col-panel="hidden" style={{ ...panelCss, ...(over?.id === '__panel__' && over.panel === 'hidden' ? { borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)', background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' } : {}) }}>
          <p style={panelTitle}>{t('cols_hidden')}</p>
          {hidden.length === 0 ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-muted-foreground)', opacity: 0.5, padding: '16px 0' }}>{t('drag_here')}</div> : hidden.map((c) => item(c, 'hidden'))}
        </div>
        <div data-col-panel="visible" style={{ ...panelCss, ...(over?.id === '__panel__' && over.panel === 'visible' ? { borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)', background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)' } : {}) }}>
          <p style={panelTitle}>{t('cols_visible')}</p>
          {shown.length === 0 ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--color-muted-foreground)', opacity: 0.5, padding: '16px 0' }}>{t('drag_here')}</div> : shown.map((c) => item(c, 'visible'))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--color-border)', padding: 6 }}>
        <button style={{ ...btnGhost, width: '100%', height: 30, border: 0, justifyContent: 'center', color: 'var(--color-muted-foreground)' }}
          onClick={() => { onChange(DEFAULT_COLS); saveCols(DEFAULT_COLS) }}>{t('reset')}</button>
      </div>
    </div>
    {dragId && dragPos && (
      <div style={{ position: 'fixed', zIndex: 60, left: dragPos.x, top: dragPos.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, padding: '6px 10px', fontSize: 14, fontWeight: 500, background: 'var(--color-card)', border: '1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)', boxShadow: '0 4px 16px rgba(0,0,0,.25)' }}>
        <GripIcon />{labelFor(dragId)}
      </div>
    )}
    </>
  )
}

function Kpi({ label: lbl, value, narrow, icon: Icon, color }: {
  label: string; value: number | null; narrow?: boolean; icon: () => JSX.Element; color: CSSProperties
}) {
  // `minWidth` réduit sur étroit pour que les 3 KPI tiennent sur une ligne au lieu de s'empiler
  // en 3 grosses cartes pleine largeur qui repoussent la liste hors de l'écran. Icône dans un
  // badge coloré à gauche, même layout que les cartes KPI de UserListPage (icon box + label/valeur).
  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: narrow ? 8 : 12, padding: narrow ? 12 : 16, flex: 1, minWidth: narrow ? 92 : 140 }}>
      <div style={{ display: 'grid', placeItems: 'center', width: narrow ? 30 : 40, height: narrow ? 30 : 40, borderRadius: 8, flexShrink: 0, ...color }}>
        <Icon />
      </div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{lbl}</span>
        <span style={{ fontSize: narrow ? 18 : 22, fontWeight: 700 }}>{value == null ? '…' : value}</span>
      </div>
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
  const narrow = useIsNarrow()
  const navigate = useNavigate()
  const [stats, setStats] = useState<RobotStats | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [site, setSite] = useState<number | null>(null)
  const [toDelete, setToDelete] = useState<DomainItem | null>(null)
  const [tick, setTick] = useState(0)
  const [cols, setCols] = useState<ColDef[]>(loadCols)
  const colsAnchorRef = useRef<HTMLDivElement>(null)
  const [showCols, setShowCols] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [mode, setMode] = useState<'react' | 'iframe'>('react')
  const [frameLoaded, setFrameLoaded] = useState(false)

  // Mobile uniquement : la table est ramenée à la seule colonne « domaine », quelle que soit la
  // préférence desktop (ColManager), le reste étant atteignable via un « + » par ligne. Le
  // comportement desktop est intact : `displayCols`/`hasHidden` ne divergent de `cols` que si
  // `narrow`. En particulier `hasHidden` ne dépend PAS de « l'utilisateur a masqué une colonne »,
  // sinon un desktop avec une colonne masquée se verrait pousser une colonne « + » inédite.
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggleExpand = (rid: number) => setExpanded((s) => {
    const n = new Set(s); n.has(rid) ? n.delete(rid) : n.add(rid); return n
  })
  // A Hidden column disappears entirely on both desktop and mobile — same rule everywhere, no "+"
  // peek at Hidden ones. Desktop shows every Visible column inline. Mobile can't fit many columns,
  // so only the FIRST Visible column (by the user's dragged order in ColManager) anchors inline;
  // every OTHER Visible column surfaces behind the per-row "+" instead, in that same order.
  const shownColsList = cols.filter((c) => c.visible)
  const displayCols = narrow ? shownColsList.map((c, i) => ({ ...c, visible: i === 0 })) : shownColsList
  const hasHidden = narrow && shownColsList.length > 1

  // Liste = scroll infini + tri server-side (keyset). `tick` (deps) relance un chargement
  // frais (reset filtres / retour du formulaire / delete) et sert aussi de trigger aux stats.
  const { items, total, loading, hasMore, sentinelRef, sortCol, sortDir, toggleSort } =
    useKeysetList<DomainItem>({
      fetcher: (a) =>
        fetchDomains({ search, site, limit: a.limit, sort: a.sort, dir: a.dir, after: a.after })
          .then((r) => ({ items: r.items, total: r.total, nextCursor: r.nextCursor })),
      deps: [search, site, tick],
      defaultSort: 'id',
      defaultDir: 'desc',
    })

  useEffect(() => { fetchRobotStats().then(setStats).catch(() => null) }, [tick])
  useEffect(() => { fetchSites().then(setSites).catch(() => null) }, [])
  // Rafraîchir au retour du formulaire (liste persistante).
  useEffect(() => { if (consumeRobotListStale()) setTick((x) => x + 1) }, [])

  // Réinitialise recherche + site puis recharge (bump `tick` → le hook recharge sur deps).
  // Le tri courant est laissé inchangé (comportement acceptable ; simplicité).
  function resetFilters() {
    setSearchInput('')
    setSearch('')
    setSite(null)
    setTick((x) => x + 1)
  }

  async function confirmDelete() {
    if (!toDelete) return
    try { await deleteRobot(toDelete.id); setToDelete(null); setTick((x) => x + 1) }
    catch { setToDelete(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: narrow ? 16 : 24, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
      {/* En-tête : titre à gauche / contrôles à droite, TOUJOURS sur une seule ligne (un
          flex-wrap ici produirait 2 barres pleine largeur empilées, pire que le desktop).
          Les ajouts « narrow » ne remplacent jamais un style desktop. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={narrow ? { minWidth: 0 } : undefined}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, ...(narrow ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}) }}>{t('title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--color-muted-foreground)', margin: '2px 0 0', ...(narrow ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}) }}>{t('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...(narrow ? { flexShrink: 0 } : {}) }}>
          <ViewToggle mode={mode} compact={narrow} labels={{ react: t('view_new'), iframe: t('view_old') }} onChange={(m) => { setMode(m); if (m === 'iframe') setFrameLoaded(true) }} />
          <button style={{ ...btnGhost, ...(narrow ? { padding: '0 10px' } : {}) }} onClick={() => setTick((x) => x + 1)} title={t('refresh')}>↻</button>
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
        <div style={narrow ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } : { display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Kpi label={t('kpi_total')} value={stats?.total ?? null} narrow={narrow} icon={GlobeIcon} color={kpiColorPrimary} />
          <Kpi label={t('kpi_with')} value={stats?.withRobots ?? null} narrow={narrow} icon={FileCheckIcon} color={kpiColorGood} />
          <Kpi label={t('kpi_without')} value={stats?.withoutRobots ?? null} narrow={narrow} icon={FileXIcon} color={kpiColorMuted} />
        </div>

        {/* Barre de filtres : sur étroit, recherche et select passent pleine largeur ;
            « Réinitialiser les filtres » (libellé long en FR) prend sa propre ligne pleine
            largeur, et Colonnes / Exporter (libellés courts) se partagent une ligne à 50/50.
            Sur desktop, la recherche est plafonnée (pas de flex:1) et le groupe d'actions est
            poussé à droite (marginLeft:auto) pour une vraie séparation visuelle avec les filtres,
            au lieu d'un simple gap uniforme (même idiome que UserListPage). */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...inputCss, height: 36, flex: narrow ? '1 1 100%' : '0 1 320px', minWidth: narrow ? 0 : 220 }} value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput.trim())}
            placeholder={t('search')} />
          <select style={{ ...inputCss, height: 36, width: narrow ? '100%' : 'auto' }} value={site ?? ''} onChange={(e) => setSite(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t('all_sites')}</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', ...(narrow ? { width: '100%' } : { marginLeft: 'auto' }) }}>
            <button style={{ ...btnGhost, height: 36, ...(narrow ? { flex: '1 1 100%', justifyContent: 'center' } : {}) }} onClick={resetFilters}><ResetIcon />{t('reset_filters')}</button>
            {/* Colonnes / Exporter à 50/50 : le calc() doit soustraire la MOITIÉ du gap (12px de
                ce conteneur → -6px chacun), pas -4px (valeur héritée d'un ancien gap:8px) — sinon
                les deux éléments réclament ensemble 4px de plus que la ligne ne peut fournir et
                le flex-wrap les repousse chacun sur sa propre ligne, quelle que soit la paire choisie. */}
            <div ref={colsAnchorRef} style={{ position: 'relative', ...(narrow ? { flex: '1 1 calc(50% - 6px)', minWidth: 0 } : {}) }}>
              <button style={{ ...btnGhost, height: 36, ...(narrow ? { width: '100%', justifyContent: 'center' } : {}) }} onClick={() => setShowCols((v) => !v)}><GripIcon />{t('columns')}</button>
              {showCols && <ColManager anchorRef={colsAnchorRef} cols={cols} labelFor={(id) => t(COL_LABEL[id])} onChange={setCols} onClose={() => setShowCols(false)} />}
            </div>
            {can('export') && <button style={{ ...btnGhost, height: 36, ...(narrow ? { flex: '1 1 calc(50% - 6px)', minWidth: 0, justifyContent: 'center' } : {}) }} onClick={() => setShowExport(true)}><DownloadIcon />{t('export')}</button>}
          </div>
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...(narrow ? {} : { minWidth: 640 }) }}>
            <thead style={{ background: 'var(--color-muted,rgba(0,0,0,.03))' }}>
              <tr>
                {hasHidden && <th style={{ ...th, width: 32, padding: '10px 8px' }} />}
                {visibleCols(displayCols).map(({ id }) => (
                  <th key={id} style={{ ...th, cursor: 'pointer', ...(id === 'id' ? { width: 70 } : {}), ...(id === 'robots' ? { width: 120 } : {}), ...(narrow ? { padding: '10px 8px' } : {}), ...(sortCol === id ? { color: 'var(--color-primary)' } : {}) }}
                    onClick={() => toggleSort(id)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{t(COL_LABEL[id])}<SortIcon dir={sortCol === id ? sortDir : null} /></span>
                  </th>
                ))}
                <th style={{ ...th, ...(narrow ? { padding: '10px 8px' } : { width: 80 }) }} />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr><td style={{ ...td, textAlign: 'center', color: 'var(--color-muted-foreground)', padding: '40px 16px' }} colSpan={visibleCols(displayCols).length + (hasHidden ? 1 : 0) + 1}>{t('empty')}</td></tr>
              ) : items.map((r) => (
                <Fragment key={r.id}>
                <tr>
                  {/* « + » d'expansion en colonne LA PLUS À GAUCHE (pas replié dans la cellule
                      d'actions à droite, où il passe inaperçu) — n'existe que sur étroit. */}
                  {hasHidden && <td style={{ ...td, padding: '10px 8px' }}><ExpandToggle expanded={expanded.has(r.id)} onClick={() => toggleExpand(r.id)} /></td>}
                  {visibleCols(displayCols).map(({ id }) => (
                    <td key={id} style={{ ...td, ...(id === 'id' ? { color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' } : {}), ...(id === 'domain' ? { fontFamily: 'monospace', fontSize: 13 } : {}), ...(narrow ? { padding: '10px 8px', overflowWrap: 'anywhere' } : {}) }}>
                      {id === 'id' && r.id}
                      {id === 'domain' && (
                        <button onClick={() => navigate(`${base}/${r.id}`)}
                          style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--color-foreground)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', ...(narrow ? { whiteSpace: 'normal', overflowWrap: 'anywhere' } : {}) }}>
                          {r.scheme ? `${r.scheme}://${r.domain}` : r.domain}
                        </button>
                      )}
                      {id === 'site' && <span style={{ fontWeight: 500 }}>{r.siteName}</span>}
                      {id === 'env' && <span style={{ color: 'var(--color-muted-foreground)' }}>{r.env}</span>}
                      {id === 'robots' && <RobotsBadge has={r.hasRobots} labelOn={t('robots_yes')} labelOff={t('robots_no')} />}
                    </td>
                  ))}
                  <td style={{ ...td, ...(narrow ? { padding: '10px 8px' } : {}) }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      {can('edit') && <button style={iconBtn} title={t('edit')} onClick={() => navigate(`${base}/${r.id}`)}><PencilIcon /></button>}
                      {can('delete') && r.hasRobots && <button style={{ ...iconBtn, color: 'var(--color-destructive,#ef4444)' }} title={t('del')} onClick={() => setToDelete(r)}><TrashIcon /></button>}
                    </div>
                  </td>
                </tr>
                {hasHidden && expanded.has(r.id) && (
                  <HiddenColsRow cols={displayCols} labelFor={(id) => t(COL_LABEL[id])}
                    renderValue={(id) => (
                      id === 'id' ? r.id
                        : id === 'domain' ? (r.scheme ? `${r.scheme}://${r.domain}` : r.domain)
                          : id === 'site' ? r.siteName
                            : id === 'env' ? r.env
                              : id === 'robots' ? <RobotsBadge has={r.hasRobots} labelOn={t('robots_yes')} labelOff={t('robots_no')} />
                                : ''
                    )}
                    colSpan={visibleCols(displayCols).length + 2} narrow={narrow} />
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div ref={sentinelRef} style={{ height: 1 }} />
          <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, color: 'var(--color-muted-foreground)' }}>
            {loading ? t('loading') : (!hasMore && items.length > 0 ? t('count', { n: total }) : '')}
          </div>
        </div>
      </>)}
      </div>

      {toDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)', ...(narrow ? { padding: 16 } : {}) }}>
          <div style={{ ...card, padding: narrow ? 20 : 24, width: '100%', maxWidth: 380 }}>
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
          fetchAll={async () => {
            // Parcourt toute la liste par lots keyset (nextCursor) — pas de limit:9999.
            const all: DomainItem[] = []
            let after: string | null = null
            do {
              const r = await fetchDomains({ search, site, limit: 100, sort: sortCol, dir: sortDir, after })
              all.push(...r.items)
              after = r.nextCursor
            } while (after)
            return all
          }}
          getCell={(r, id) => id === 'id' ? r.id : id === 'domain' ? r.domain : id === 'site' ? r.siteName : id === 'env' ? r.env : id === 'robots' ? (r.hasRobots ? t('robots_yes') : t('robots_no')) : ''}
          filename={t('export_filename')} sheetName={t('title')} total={total}
          onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}

// ── Formulaire : édition du robots.txt d'un domaine ────────────────────────────
function RobotForm({ id, base }: { id: string; base: string }) {
  const t = useT()
  const narrow = useIsNarrow()
  const navigate = useNavigate()
  const domainId = parseInt(id)

  const [domain, setDomain] = useState('')
  const [siteName, setSiteName] = useState('')
  const [robotText, setRobotText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Bannière d'erreur unifiée : titre (bandeau) + liste du/des champ(s) en cause.
  const [errTitle, setErrTitle] = useState<string | null>(null)
  const [issues, setIssues] = useState<FormIssue[]>([])
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
    setErrTitle(null); setIssues([]); setSaving(true)
    try {
      await saveRobot({ id: domainId, robotText })
      setSaved(true)
      markRobotListStale()
      notify('ok', t('title'), t('saved'))
      setTimeout(() => navigate(base), 500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('err_save')
      setErrTitle(t('err_headline')); setIssues([{ label: t('f_robot'), message: msg }])
      koNotify(t('title'), t('err_headline'))
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: narrow ? 16 : 24, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={narrow ? { minWidth: 0 } : undefined}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, ...(narrow ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}) }}>{t('edit_title', { n: domain || ('#' + id) })}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...(narrow ? { flexShrink: 0 } : {}) }}>
          {saved && <span style={{ fontSize: 14, color: '#059669' }}>{t('saved')}</span>}
          <button style={btnPrimary} onClick={submit} disabled={saving || loading}>{saving ? '…' : t('save')}</button>
        </div>
      </div>

      {errTitle && <FormErrorBanner title={errTitle} issues={issues} />}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-muted-foreground)' }}>{t('loading')}</div>
      ) : (
        <div style={{ ...card, padding: narrow ? 16 : 20, maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: narrow ? '1 1 100%' : 1, minWidth: narrow ? 0 : 220 }}>
              <label style={label}>{t('f_domain')}</label>
              <input style={{ ...inputCss, fontFamily: 'monospace', opacity: 0.75 }} value={domain} readOnly />
            </div>
            <div style={{ flex: narrow ? '1 1 100%' : 1, minWidth: narrow ? 0 : 180 }}>
              <label style={label}>{t('f_site')}</label>
              <input style={{ ...inputCss, opacity: 0.75 }} value={siteName} readOnly />
            </div>
          </div>
          <div>
            <label style={label}>{t('f_robot')}</label>
            <textarea value={robotText} onChange={(e) => setRobotText(e.target.value)} placeholder={t('f_robot_ph')}
              spellCheck={false}
              style={{ ...inputCss, height: narrow ? 240 : 320, padding: 12, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre' }} />
            <p style={hint}>{t('f_robot_hint')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
