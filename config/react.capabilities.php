<?php

/**
 * Capacités d'outils — droits avancés du back-office React (module MelisCmsSiteRobot).
 *
 * Même convention que melis-commerce / melis-cms-* : déclaration plate par melisKey dans la clé
 * mergée `melisReactToolCapabilities` (lue par MelisReactApi\Service\Capabilities). Fichier séparé ;
 * mergé dans MelisCmsSiteRobot\Module::getConfig(). Default-allow.
 *
 * ⚠️ Key = melisKey of the RIGHTS-BEARING menu node (nodeKey = melisKey||key), i.e. the one with
 * rights_checkbox_disable=false: `meliscms_site_robot_tools_section` (app.interface.php). That is
 * what RightsTreeView hangs capability checkboxes on, what the legacy rights modal stores, and the
 * react-api guard's MELIS_KEY. NOT `site_robot_tool_display`: that is the `type` TARGET, which stays
 * the renderable ZONE key (iframe react-tool-page?key=) and is not granted on its own.
 *
 * L'outil « Robots » est une liste + éditeur SANS création (les domaines viennent des Sites) :
 *   - list   : voir la liste des domaines
 *   - edit   : ouvrir/enregistrer le robots.txt d'un domaine (get + save)
 *   - delete : effacer le robots.txt d'un domaine
 *   - export : bouton d'export (réutilise la liste — garde purement UI)
 * (pas de `create` : impossible d'ajouter un domaine depuis cet outil.)
 */

return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
