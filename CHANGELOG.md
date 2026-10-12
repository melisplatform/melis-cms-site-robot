# Changelog

## v6.0.5 - 2026-09-25
### Security
* **security:** declare a grantable tool key on the legacy controller (audit item 7.0)
### Fixed
* **config:** drop duplicate translator locale key forcing the platform to fr_FR

## v6.0.3 - 2026-08-20
### Security
* Gate mutating/data actions in legacy tool controllers (CWE-862)
### Fixed
* **site-robot-react:** use the code-xml </> icon for the "New" toggle
### Docs
* **melisai:** React back-office AI documentation for MelisCmsSiteRobot

## v6.0.1 - 2026-08-10
### Added
* **composer:** add docs link and authors block, swap zf2 keyword for laminas, bump php constraint to ^8.3|^8.5

## v6.0.0 - 2026-08-10
### Security
* **security:** add SECURITY.md (private vulnerability reporting policy)
* Fix audit findings
* **rights:** put the Site Robots rights key back on the left-menu path
### Added
* **marketplace:** add React back-office screenshots (etc/MarketPlace/images/react)
* **site-robot:** mobile-responsive React brick (narrow-driven, desktop untouched)
* **cms-react:** listes infinies keyset + tri server-side + icones de tri unifiees
* **react:** add a "Reset filters" button to the tool list page(s)
* **siterobot:** full-React migration — per-domain robots.txt editor (list of domains + robots.txt edit) + list/edit/delete/export capabilities
* **react:** site-robot React brick (iframe)
* Add MelisAI module documentation for AI consumption
### Fixed
* **site-robot:** KPI icons, mobile filter-bar spacing, i18n toggle labels
* **site-robot:** renomme le libellé du menu "Robots" en "Robots.txt"
* **react:** éviter que le popover Colonnes soit rogné en bas de viewport
* **site-robot:** sync brick + export/list page tweaks
### Dependencies & build
* **composer:** bump melis-core/melis-cms constraint to ^6.0
### Docs
* **meliscmssiterobot:** rewrite as two-part doc (functional guide + technical reference with examples)

## v5.3.0 - 2024-09-25
### Changed
* Update jQuery 3.7.1 migration

## v5.2.0 - 2024-06-06
* Maintenance release.

## v5.1.0 - 2024-02-13
* Maintenance release.

## v5.0.0 - 2022-06-22
### Changed
* Changed deprecated ArraySerializable to ArraySerializableHydrator
