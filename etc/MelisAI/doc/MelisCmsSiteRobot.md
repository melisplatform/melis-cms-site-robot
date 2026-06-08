---
title: MelisCmsSiteRobot module
package: melisplatform/melis-cms-site-robot
doc_type: module-documentation
audience: ai
language: en
module_version: unversioned   # no `version` field in composer.json; this doc tracks the current source
last_reviewed: 2026-06-08
maintainer: Melis Technology
keywords: [robots.txt, robots, seo, crawlers, site, domain, cms, melis, back-office]
screenshots_dir: ./images
---

# MelisCmsSiteRobot Module — Functional Documentation (for AI)

> **Purpose of this document**: describe, functionally and technically, the
> `melisplatform/melis-cms-site-robot` module, so that an AI (or a developer) can
> understand *what the module does*, *which tools it provides*, *how they work* and
> *where the corresponding code lives*.
>
> **Audience**: consumed by the **MelisAI** module (a MelisPlatform module that exposes an
> MCP function to answer user questions). MelisAI fetches this `.md` file and the
> screenshots in `./images/` **on demand** — so the doc is self-contained and §9 acts as
> the filename→content index for retrieving a specific screenshot.
>
> **Status**: reviewed 2026-06-08 against the current source. The module carries no
> semantic version (no `version` in `composer.json`), so treat this doc as describing the
> current `melisplatform/melis-cms-site-robot` source rather than a tagged release.
>
> Screenshots live in `./images/` (relative paths `./images/...`).

---

## 1. Overview

`MelisCmsSiteRobot` adds the ability to **manage a `robots.txt` per site domain** and to
**serve it dynamically** from the front-office. Editors edit, per domain, the text that
search-engine crawlers receive at `https://<domain>/robots.txt`; the module stores it in
the database and returns it on request — no static file to maintain on disk.

| Item | Value |
|---|---|
| Package name | `melisplatform/melis-cms-site-robot` |
| Type | `melisplatform-module` |
| PHP namespace | `MelisCmsSiteRobot\` → `src/` (PSR-4) |
| Melis category | `cms` |
| License | OSL-3.0 |
| PHP required | `^8.1 | ^8.3` |
| Framework | Laminas (ex-Zend Framework 2/3), Melis MVC architecture |
| dbdeploy | `true` (DB migrations applied automatically) |

### Dependencies (required Melis modules)

Declared in `composer.json`:

- `melisplatform/melis-core` (`^5.2`) — foundation, services, events, rights, translations
- `melisplatform/melis-cms` (`^5.2`) — CMS, sites/domains

> The `README.md` lists `melis-engine` as a prerequisite; the **table gateways** used to
> read/write robots data (`MelisEngineTableRobot`, `MelisEngineTableSiteDomain`) live in
> **melis-engine**, which the module relies on at runtime. It comes in through the standard
> Melis platform install.

---

## 2. Functional concepts

- **Robots text per domain**: each **site domain** can have a stored `robots.txt` body
  (`robot_text`) keyed by the domain name (`robot_site_domain`).
- **Dynamic serving**: a dedicated front route `/robots.txt` returns the stored text for the
  **requesting domain** (rather than serving a static file). If a domain has no entry, the
  response is empty/default.
- **Per-site management**: the back-office tool lists every site domain (joined with its
  site) so editors can edit each domain's robots text from one place.

### Data model (MySQL table)

| Table | Role | Primary key |
|---|---|---|
| `melis_cms_domain_robots` | The `robots.txt` body for a domain (`robot_site_domain`, `robot_text`) | `robot_id` |

- The tool lists **site domains** (engine's site-domain table, columns `sdom_id`,
  `site_label`, `sdom_domain`) and links each to its `melis_cms_domain_robots` row.
- MySQL Workbench model: `install/sql/Model/MelisSiteRobot.mwb`
- Base structure: `install/sql/setup_structure.sql`
- Incremental migrations: `install/dbdeploy/*.sql`

---

## 3. Tools and elements provided

The module exposes:

1. **The Site Robot tool (back-office)** — list domains + edit each domain's robots.txt
2. **A dynamic `/robots.txt` front route** — serves the stored text per domain

Everything is driven by a single controller: `src/Controller/ToolSiteRobotController.php`.

---

### 3.1 Site Robot tool (back-office)

Accessible from the Melis back-office left menu, **CMS** tools tree section (icon
`fa-server`). Declared in `config/app.interface.php` (key `site_robot_tool_display`).

- **Controller**: `src/Controller/ToolSiteRobotController.php`
- **Table configuration**: `config/app.tools.php` (key `melissiterobot_tool_templates`)
- **Views**: `view/melis-cms-site-robot/tool-site-robot/*.phtml`

A Melis DataTable of **site domains** with columns: domain id (`sdom_id`), site
(`site_label`), domain (`sdom_domain`). Filters: **limit**, **choose sites**
(`toolSiteRobotContentFiltersSitesAction`) on the left; **search** (center); **refresh**
(right). Data loads via AJAX from
`/melis/MelisCmsSiteRobot/ToolSiteRobot/getSiteRobotData` (`getSiteRobotDataAction`).

There is **no "Add new"** action: the rows are not created by the user — there is **one
entry per existing site domain** (the list mirrors the platform's site domains). You only
**Edit** an existing row; the domain itself is read-only.

Per-row action: **Edit** (`toolContentTableActionEditAction`) opens a modal
(`toolModalContainerAction` / `toolModalContentAction`, form `site_robot_form`) with the
**domain** (read-only) and a **`robot_text`** textarea — the full robots.txt body for that
domain. Saving goes through `saveSiteRobotAction` → upserts the domain's
`melis_cms_domain_robots` row (the robots row is created on first save if absent).

![Site Robot tool — the list of site domains](./images/meliscmssiterobot-tool-robots-list.png)
*Caption: the Site Robot tool — a table of every site domain (id, site, domain) with limit,
site-chooser and search filters, and a per-row Edit action.*

![Site Robot tool — edit robots.txt modal](./images/meliscmssiterobot-tool-robots-edit.png)
*Caption: the edit modal — the (read-only) domain and the robots.txt text area where the
domain's `robots.txt` body is written.*

---

### 3.2 Dynamic `/robots.txt` front route

Declared in `config/module.config.php` (route `melis-cms-site-robot-special-urls` →
`robots_txt`): the URL **`/robots.txt`** is handled by
`ToolSiteRobotController::toolRobotsTxtAction`, which looks up the stored `robot_text` for
the **requesting domain** and returns it as the response (view
`tool-site-robot/tool-robots-txt.phtml`). This is what crawlers receive — the content is
served from the database, editable live from the tool (§3.1).

---

### 3.3 Data access

The module does not define its own service alias; data is read/written through
**melis-engine** table gateways (see README):

```php
// Site domains (to list in the tool)
$table = $this->getServiceManager()->get('MelisEngineTableSiteDomain');
$data  = $table->getData($searchValue, $searchableCols, $selColOrder, $orderDirection, $start, $length)->toArray();

// robots.txt content + data for a given domain
$robotTable = $this->getServiceManager()->get('MelisEngineTableRobot');
$robotData  = (array) $robotTable->getEntryByField('robot_site_domain', $domainName)->current();
```

`MelisEngineTableRobot` maps to this module's `melis_cms_domain_robots` table.

---

## 4. Extensions and integrations

### 4.1 Listener (`src/Listener/`)

| Listener | Role |
|---|---|
| `MelisCmsSiteRobotFlashMessengerListener` | Back-office interface flash messages (attached only on the back-office route) |

### 4.2 Diagnostic

- `config/diagnostic.config.php` — module health checks (Melis diagnostic system).

---

## 5. Front assets

Declared in `config/app.interface.php` (key `ressources`) and `module.config.php`
(`asset_manager`):

- **JS**: `public/js/site-robot.tool.js`
- **CSS**: `public/css/site-robot.style.css`
- **Compiled bundle**: `public/build/css/bundle.css`, `public/build/js/bundle.js`

---

## 6. Internationalization

- Translation files: `language/en_EN.interface.php`, `language/fr_FR.interface.php`
- Interface keys use `tr_site_robot_*` / `tr_sdom_*` / `tr_robot_text` prefixes.
- Translation loading: `Module::createTranslations()`.

---

## 7. Quick code map

```
melis-cms-site-robot/
├── composer.json                 → module dependencies & metadata (dbdeploy: true)
├── config/
│   ├── module.config.php         → routes (incl. the /robots.txt front route), controller, asset manager
│   ├── app.interface.php         → back-office menu + the Site Robot tool layout
│   ├── app.tools.php             → the domains DataTable + the edit form (domain + robot_text)
│   └── diagnostic.config.php     → diagnostic tests
├── src/
│   ├── Module.php                → bootstrap, flash listener, translations
│   ├── Controller/               → ToolSiteRobotController (tool + the /robots.txt action)
│   └── Listener/                 → MelisCmsSiteRobotFlashMessengerListener
├── view/                         → .phtml templates (tool list, edit modal, robots-txt output)
├── public/                       → JS/CSS assets + bundles
├── language/                     → en_EN / fr_FR translations
├── install/                      → SQL (structure, MWB model, dbdeploy migration)
└── etc/                          → MarketPlace (xml) + MelisAI/doc (this doc)
```

---

## 8. Typical lifecycle

1. **Open** the Site Robot tool (back-office → CMS tools → Site robots).
2. **Pick a domain** from the list (optionally filter by site / search).
3. **Edit** that domain's `robots.txt` body in the modal textarea → `saveSiteRobotAction`
   → `melis_cms_domain_robots`.
4. **Serve**: a crawler requesting `https://<domain>/robots.txt` hits `toolRobotsTxtAction`,
   which returns the stored text for that domain — live, no static file.

---

## 9. Screenshot index (for on-demand retrieval)

All screenshots live in `./images/` (i.e. `/etc/MelisAI/doc/images/`). This table is the
**filename → content** index the MelisAI MCP uses to fetch a specific screenshot on demand;
each row's caption in the body gives the text-only description of what the image shows.

| Image file | Content |
|---|---|
| `meliscmssiterobot-tool-robots-list.png` | Site Robot tool — the list of site domains (id, site, domain) with filters |
| `meliscmssiterobot-tool-robots-edit.png` | Site Robot tool — edit modal (domain + robots.txt textarea) |

---

*Document for AI consumption (MelisAI MCP) — describes the `melisplatform/melis-cms-site-robot`
module. Last reviewed 2026-06-08 against the current source.*
