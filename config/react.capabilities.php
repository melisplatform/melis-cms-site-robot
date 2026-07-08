<?php

/**
 * Capacités d'outils — droits avancés du back-office React (module MelisCmsSiteRobot).
 *
 * Même convention que melis-commerce / melis-cms-* : déclaration plate par melisKey dans la clé
 * mergée `melisReactToolCapabilities` (lue par MelisReactApi\Service\Capabilities). Fichier séparé ;
 * mergé dans MelisCmsSiteRobot\Module::getConfig(). Default-allow.
 *
 * ⚠️ Clé = nodeKey du menu (`node.melisKey || node.key`) de l'outil — ici `site_robot_tool_display`
 * (unifié : = le MELIS_KEY de garde du contrôleur react-api ET le `makeCan`/`can` de la brique).
 * C'est ce que RightsTreeView utilise pour rattacher les cases de capacités.
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
        'site_robot_tool_display' => ['list', 'edit', 'delete', 'export'],
    ],
];
