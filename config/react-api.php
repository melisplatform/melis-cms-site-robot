<?php

/**
 * Routes + contrôleur React API fournis par MelisCmsSiteRobot (outil « Robots », robots.txt par domaine).
 *
 * S'ajoute aux child_routes de `melis-react-api` (bridge générique). Modularité : le contrôleur /
 * routes / invokable de l'outil vivent dans SON module. ArrayUtils::merge fusionne. Mergé via
 * MelisCmsSiteRobot\Module::getConfig(). Ordre : /stats /sites /save /delete AVANT le catch-all /:id.
 */

return [
    'router' => [
        'routes' => [
            'melis-backoffice' => [
                'child_routes' => [
                    'melis-react-api' => [
                        'child_routes' => [
                            'site-robots-list' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'    => '/site-robots[/]',
                                    'defaults' => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'list',
                                    ],
                                ],
                            ],
                            'site-robots-stats' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'    => '/site-robots/stats[/]',
                                    'defaults' => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'stats',
                                    ],
                                ],
                            ],
                            'site-robots-sites' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'    => '/site-robots/sites[/]',
                                    'defaults' => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'sites',
                                    ],
                                ],
                            ],
                            'site-robots-save' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'    => '/site-robots/save[/]',
                                    'defaults' => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'save',
                                    ],
                                ],
                            ],
                            'site-robots-delete' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'       => '/site-robots/delete/:id',
                                    'constraints' => ['id' => '[0-9]+'],
                                    'defaults'    => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'delete',
                                    ],
                                ],
                            ],
                            'site-robots-item' => [
                                'type'    => 'Segment',
                                'options' => [
                                    'route'       => '/site-robots/:id',
                                    'constraints' => ['id' => '[0-9]+'],
                                    'defaults'    => [
                                        '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                        'controller'    => 'MelisReactApiSiteRobot',
                                        'action'        => 'get',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ],

    'controllers' => [
        'invokables' => [
            'MelisCmsSiteRobot\Controller\MelisReactApiSiteRobot' => \MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController::class,
        ],
    ],
];
