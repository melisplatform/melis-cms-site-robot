<?php

return array(
    'router' => array(
        'routes' => array(
            'melis-backoffice' => array(
                'type'    => 'Segment',
                'options' => array(
                    'route'    => '/melis[/]',
                ),
                'child_routes' => array(
                    'application-MelisCmsSiteRobot' => array(
                        'type'    => 'Literal',
                        'options' => array(
                            'route'    => 'MelisCmsSiteRobot',
                            'defaults' => array(
                                '__NAMESPACE__' => 'MelisCmsSiteRobot\Controller',
                                'controller'    => 'ToolSiteRobot',
                                'action'        => 'toolContainer',
                            ),
                        ),
                        // this route will be accessible in the browser by browsing
                        // www.domain.com/melis/ToolSiteRobotController/controller/action
                        'may_terminate' => true,
                        'child_routes' => array(
                            'default' => array(
                                'type'    => 'Segment',
                                'options' => array(
                                    'route'    => '/[:controller[/:action]]',
                                    'constraints' => array(
                                        'controller' => '[a-zA-Z][a-zA-Z0-9_-]*',
                                        'action'     => '[a-zA-Z][a-zA-Z0-9_-]*',
                                    ),
                                    'defaults' => array(
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
            'melis-cms-site-robot-special-urls' => array(
                'type'    => 'Literal',
                'options' => array(
                    'route'    => '/',
                ),
                'may_terminate' => false,
                'child_routes' => array(
                    'robots_txt' => array(
                        'type' => 'Literal',
                        'options' => array(
                            'route'    => 'robots.txt',
                            'defaults' => array(
                                'controller' => 'MelisCmsSiteRobot\Controller\ToolSiteRobot',
                                'action'     => 'toolRobotsTxt',
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),

    'translator' => array(
        'locale' => 'en_EN',
        'locale' => 'fr_FR',
    ),

    'service_manager' => array(
        'invokables' => array(
        ),
        'aliases' => array(
            'translator' => 'MvcTranslator',
        ),
        'factories' => array(
            'MelisCmsSiteRobotTable' => 'MelisCmsSiteRobot\Model\Tables\Factory\MelisCmsSiteRobotTableFactory',
        ),
    ),

    'controllers' => array(
        'invokables' => array(
            'MelisCmsSiteRobot\Controller\ToolSiteRobot' => 'MelisCmsSiteRobot\Controller\ToolSiteRobotController',
        ),
    ),
    'view_manager' => array(
        'display_not_found_reason' => true,
        'display_exceptions'       => true,
        'doctype'                  => 'HTML5',
        'template_map' => array(
        ),
        'template_path_stack' => array(
            __DIR__ . '/../view',
        ),
        'strategies' => array(
            'ViewJsonStrategy',
        ),
    ),

    'asset_manager' => array(
        'resolver_configs' => array(
            'aliases' => array(
                'MelisCmsSiteRobot/' => __DIR__ . '/../public/',
            ),
        ),
    ),

);