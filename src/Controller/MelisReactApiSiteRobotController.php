<?php

namespace MelisCmsSiteRobot\Controller;

use MelisReactApi\Controller\CapabilityGuardTrait;

use Laminas\Http\PhpEnvironment\Response as HttpResponse;
use MelisCore\Controller\MelisAbstractActionController;

/**
 * API REST pour l'outil « Robots » de MelisCmsSiteRobot (robots.txt par domaine de site).
 *
 * Couche API (shared) du back-office React ; l'UI est livrée par la BRIQUE du module.
 * Calqué sur le gabarit full-React (MelisCms\SiteRedirect). Forme particulière : la LISTE = les
 * DOMAINES de sites (`melis_cms_site_domain`), chacun avec un robots.txt optionnel stocké dans
 * `melis_cms_domain_robots` (matché par le NOM de domaine `robot_site_domain = sdom_domain`).
 * On n'ajoute pas de domaine ici (ils viennent des Sites) — on ÉDITE le robots.txt d'un domaine.
 *
 * Routes :
 *   GET    /melis/react-api/site-robots            → liste paginée (domaines) + recherche + filtre site
 *   GET    /melis/react-api/site-robots/stats      → statistiques (KPI)
 *   GET    /melis/react-api/site-robots/sites      → options du filtre de site
 *   GET    /melis/react-api/site-robots/:id        → détail d'un domaine + son robots.txt (id = sdom_id)
 *   POST   /melis/react-api/site-robots/save       → upsert du robots.txt d'un domaine
 *   DELETE /melis/react-api/site-robots/delete/:id → efface le robots.txt d'un domaine (le domaine reste)
 */
class MelisReactApiSiteRobotController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;

    /** melisKey de l'outil (nœud menu / garde de droits). */
    private const MELIS_KEY = 'site_robot_tool_display';

    // ─── GET /site-robots ─────────────────────────────────────────────────────────

    public function listAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; }

        try {
            $page   = max(1, (int) $this->params()->fromQuery('page', 1));
            $limit  = min(9999, max(1, (int) $this->params()->fromQuery('limit', 25)));
            $search = trim((string) ($this->params()->fromQuery('search', '') ?? ''));
            $siteId = (int) $this->params()->fromQuery('site', 0) ?: null;
            $offset = ($page - 1) * $limit;

            $db = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');

            $where = [];
            $params = [];
            if ($search !== '') {
                $like    = '%' . $search . '%';
                $where[] = '(d.sdom_domain LIKE ? OR s.site_name LIKE ? OR s.site_label LIKE ?)';
                $params  = array_merge($params, [$like, $like, $like]);
            }
            if ($siteId) {
                $where[] = 'd.sdom_site_id = ?';
                $params[] = $siteId;
            }
            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

            $countRow = iterator_to_array($db->query(
                "SELECT COUNT(*) AS total
                 FROM melis_cms_site_domain d
                 LEFT JOIN melis_cms_site s ON s.site_id = d.sdom_site_id
                 $whereClause",
                $params
            ));
            $total = (int) ($countRow[0]['total'] ?? 0);

            $rows = $db->query(
                "SELECT d.sdom_id, d.sdom_site_id, d.sdom_domain, d.sdom_env, d.sdom_scheme,
                        s.site_name, s.site_label, r.robot_text
                 FROM melis_cms_site_domain d
                 LEFT JOIN melis_cms_site s ON s.site_id = d.sdom_site_id
                 LEFT JOIN melis_cms_domain_robots r ON r.robot_site_domain = d.sdom_domain
                 $whereClause
                 ORDER BY d.sdom_id DESC
                 LIMIT ? OFFSET ?",
                array_merge($params, [$limit, $offset])
            );

            $items = [];
            foreach ($rows as $row) {
                $items[] = $this->formatDomain((array) $row);
            }

            return $this->jsonResponse([
                'success' => true,
                'data'    => ['items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit],
            ]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── GET /site-robots/stats ───────────────────────────────────────────────────

    public function statsAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; }

        try {
            $db  = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');
            $row = (array) (iterator_to_array($db->query(
                "SELECT COUNT(*) AS total,
                        SUM(CASE WHEN r.robot_text IS NOT NULL AND TRIM(r.robot_text) <> '' THEN 1 ELSE 0 END) AS with_robots
                 FROM melis_cms_site_domain d
                 LEFT JOIN melis_cms_domain_robots r ON r.robot_site_domain = d.sdom_domain",
                []
            ))[0] ?? []);

            $total = (int) ($row['total'] ?? 0);
            $with  = (int) ($row['with_robots'] ?? 0);

            return $this->jsonResponse([
                'success' => true,
                'data'    => ['total' => $total, 'withRobots' => $with, 'withoutRobots' => max(0, $total - $with)],
            ]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── GET /site-robots/sites ───────────────────────────────────────────────────

    public function sitesAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; }

        try {
            $db   = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');
            $rows = iterator_to_array($db->query(
                'SELECT site_id, site_name, site_label FROM melis_cms_site ORDER BY site_label ASC, site_name ASC',
                []
            ));
            $sites = array_map(fn ($r) => [
                'id'   => (int) $r['site_id'],
                'name' => trim((string) $r['site_label']) !== '' ? (string) $r['site_label'] : (string) $r['site_name'],
            ], $rows);

            return $this->jsonResponse(['success' => true, 'data' => ['sites' => $sites]]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── GET /site-robots/:id ─────────────────────────────────────────────────────

    public function getAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('edit')) { return $denyCap; }

        $id = (int) $this->params()->fromRoute('id', 0);
        if ($id <= 0) {
            return $this->jsonResponse(['success' => false, 'error' => 'Invalid ID'], 400);
        }

        try {
            $db   = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');
            $rows = iterator_to_array($db->query(
                "SELECT d.sdom_id, d.sdom_site_id, d.sdom_domain, d.sdom_env, d.sdom_scheme,
                        s.site_name, s.site_label, r.robot_text
                 FROM melis_cms_site_domain d
                 LEFT JOIN melis_cms_site s ON s.site_id = d.sdom_site_id
                 LEFT JOIN melis_cms_domain_robots r ON r.robot_site_domain = d.sdom_domain
                 WHERE d.sdom_id = ?",
                [$id]
            ));
            if (!$rows) {
                return $this->jsonResponse(['success' => false, 'error' => 'Not found'], 404);
            }
            $item = $this->formatDomain((array) $rows[0]);
            $item['robotText'] = (string) (((array) $rows[0])['robot_text'] ?? '');
            return $this->jsonResponse(['success' => true, 'data' => $item]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── POST /site-robots/save ───────────────────────────────────────────────────

    public function saveAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('edit')) { return $denyCap; }

        try {
            $body      = json_decode($this->getRequest()->getContent(), true) ?? [];
            $id        = (int) ($body['id'] ?? 0); // sdom_id
            $robotText = (string) ($body['robotText'] ?? '');

            if ($id <= 0) {
                return $this->jsonResponse(['success' => false, 'error' => 'Domaine invalide.'], 400);
            }

            $db = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');

            // Le domaine doit exister → on récupère son nom (clé de jointure des robots).
            $domRows = iterator_to_array($db->query('SELECT sdom_domain FROM melis_cms_site_domain WHERE sdom_id = ?', [$id]));
            if (!$domRows) {
                return $this->jsonResponse(['success' => false, 'error' => 'Domaine introuvable.'], 404);
            }
            $domain = (string) $domRows[0]['sdom_domain'];

            // Upsert du robots.txt, keyé par le nom de domaine (comme le legacy).
            $existing = iterator_to_array($db->query('SELECT robot_id FROM melis_cms_domain_robots WHERE robot_site_domain = ?', [$domain]));
            if ($existing) {
                $db->query('UPDATE melis_cms_domain_robots SET robot_text = ? WHERE robot_site_domain = ?', [$robotText, $domain]);
            } else {
                $db->query('INSERT INTO melis_cms_domain_robots (robot_site_domain, robot_text) VALUES (?, ?)', [$domain, $robotText]);
            }

            return $this->jsonResponse(['success' => true, 'data' => ['id' => $id]]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── DELETE /site-robots/delete/:id ───────────────────────────────────────────
    // Efface le robots.txt d'un domaine (le DOMAINE lui-même n'est pas supprimé — il vient des Sites).

    public function deleteAction(): HttpResponse
    {
        if ($deny = $this->denyUnlessAccess()) { return $deny; }
        if ($denyCap = $this->denyUnlessCan('delete')) { return $denyCap; }

        $id = (int) $this->params()->fromRoute('id', 0);
        if ($id <= 0) {
            return $this->jsonResponse(['success' => false, 'error' => 'Invalid ID'], 400);
        }

        try {
            $db      = $this->getServiceManager()->get('Laminas\Db\Adapter\AdapterInterface');
            $domRows = iterator_to_array($db->query('SELECT sdom_domain FROM melis_cms_site_domain WHERE sdom_id = ?', [$id]));
            if (!$domRows) {
                return $this->jsonResponse(['success' => false, 'error' => 'Not found'], 404);
            }
            $domain = (string) $domRows[0]['sdom_domain'];
            $db->query('DELETE FROM melis_cms_domain_robots WHERE robot_site_domain = ?', [$domain]);
            return $this->jsonResponse(['success' => true, 'data' => null]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private function formatDomain(array $r): array
    {
        $siteName = trim((string) ($r['site_label'] ?? ''));
        if ($siteName === '') { $siteName = (string) ($r['site_name'] ?? ''); }
        $robotText = (string) ($r['robot_text'] ?? '');
        return [
            'id'        => (int)    $r['sdom_id'],
            'domain'    => (string) $r['sdom_domain'],
            'siteId'    => (int)    $r['sdom_site_id'],
            'siteName'  => $siteName !== '' ? $siteName : ('#' . (int) $r['sdom_site_id']),
            'env'       => (string) ($r['sdom_env'] ?? ''),
            'scheme'    => (string) ($r['sdom_scheme'] ?? ''),
            'hasRobots' => trim($robotText) !== '',
        ];
    }

    private function isAuthenticated(): bool
    {
        return $this->getServiceManager()->get('MelisCoreAuth')->hasIdentity();
    }

    private function denyUnlessAccess(): ?HttpResponse
    {
        if (!$this->isAuthenticated()) {
            return $this->jsonResponse(['success' => false, 'error' => 'Unauthenticated'], 401);
        }
        try {
            if (!$this->getServiceManager()->get('MelisCoreRights')->canAccess(self::MELIS_KEY)) {
                return $this->jsonResponse(['success' => false, 'error' => 'Forbidden'], 403);
            }
        } catch (\Throwable) {}
        return null;
    }

    private function jsonResponse(array $data, int $status = 200): HttpResponse
    {
        /** @var HttpResponse $response */
        $response = $this->getResponse();
        $response->setStatusCode($status);
        $response->getHeaders()->addHeaders([
            'Content-Type'           => 'application/json; charset=utf-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
        $response->setContent(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response;
    }

    private function errorResponse(\Throwable $e, int $status = 500): HttpResponse
    {
        return $this->jsonResponse([
            'success' => false,
            'error'   => $e->getMessage(),
            'file'    => basename($e->getFile()) . ':' . $e->getLine(),
        ], $status);
    }
}
