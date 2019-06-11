<?php

return array(

    'plugins' => array(
        'meliscore' => array(
            'interface' => array(
                'meliscore_leftmenu' => array(
                    'interface' => array(
                        'meliscms_toolstree_section' => array(
                            'interface' => array(
                                'meliscms_site_robot_tools' => [
                                    'conf' => array(
                                        'id' => 'id_meliscms_site_robot_tools',
                                        'name' => 'tr_site_robots',
                                        'icon' => 'fa-server',
                                        'rights_checkbox_disable' => true,
                                        'melisKey' => 'meliscms_site_robot_tools',
                                    ),
                                    'interface' => [
                                        'melis_cms_site_robots_config' => array(
                                            'conf' => array(
                                                'type' => '/melis_cms_site_robots/interface/site_robot_tool_display',
                                                'name' => 'tr_site_robot_title',
                                            )
                                        ),
                                    ]
                                ],
                            ),
                        ),
                    ),
                ),
            ),
        ),

        /**
         * this is the configuration of the tool
         */
        'melis_cms_site_robots' => array(
            'conf' => array(
                'rightsDisplay' => 'none',
                'name' => 'tr_site_robot_title',
            ),
            'ressources' => array(
                'css' => array(
                    '/MelisCmsSiteRobot/css/site-robot.style.css',
                ),
                'js' => array(
                    '/MelisCmsSiteRobot/js/site-robot.tool.js',
                ),
                /**
                 * the "build" configuration compiles all assets into one file to make
                 * lesser requests
                 */
                'build' => [
                    // lists of assets that will be loaded in the layout
                    'css' => [
                        '/MelisCmsSiteRobot/build/css/bundle.css',

                    ],
                    'js' => [
                        '/MelisCmsSiteRobot/build/js/bundle.js',
                    ]
                ]
            ),
            'datas' => array(),
            'interface' => array(
                'site_robot_tool_display' => array(
                    'conf' => array(
                        'id'   => 'id_site_robot_tool_display',
                        'name' => 'tr_site_robot_tool_display_title',
                        'melisKey' => 'site_robot_tool_display',
                        'icon' => 'fa fa-server',
                        'rights_checkbox_disable' => true
                    ),
                    'forward' => array(
                        'module' => 'MelisCmsSiteRobot',
                        'controller' => 'ToolSiteRobot',
                        'action' => 'tool-container',
                        'jscallback' => '',
                        'jsdatas' => array()
                    ),
                    'interface' => array(
                        'site_robot_tool_header' => array(
                            'conf' => array(
                                'id'   => 'id_site_robot_header',
                                'name' => 'tr_site_robot_header',
                                'melisKey' => 'site_robot_header',
                            ),
                            'forward' => array(
                                'module' => 'MelisCmsSiteRobot',
                                'controller' => 'ToolSiteRobot',
                                'action' => 'tool-header-container',
                                'jscallback' => '',
                                'jsdatas' => array()
                            ),
                            'interface' => array(
                            ),
                        ),

                        'site_robot_tool_content' => array(
                            'conf' => array(
                                'id'   => 'id_site_robot_tool_content',
                                'name' => 'tr_site_robot_content',
                                'melisKey' => 'site_robot_tool_content',
                            ),
                            'forward' => array(
                                'module' => 'MelisCmsSiteRobot',
                                'controller' => 'ToolSiteRobot',
                                'action' => 'tool-content-container',
                                'jscallback' => '',
                                'jsdatas' => array()
                            ),
                            'interface' => array(

                            ),
                        ),

                        'site_robot_tool_modal_container' => array(
                            'conf' => array(
                                'id'   => 'id_site_robot_tool_modals',
                                'name' => 'tr_site_robot_modal_container',
                                'melisKey' => 'site_robot_tool_modals',
                            ),
                            'forward' => array(
                                'module' => 'MelisCmsSiteRobot',
                                'controller' => 'ToolSiteRobot',
                                'action' => 'tool-modal-container',
                                'jscallback' => '',
                                'jsdatas' => array()
                            ),
                            'interface' => array(
                                'site_robot_tool_modal_content' => array(
                                    'conf' => array(
                                        'id' => 'id_site_robot_tool_modal_content',
                                        'melisKey' => 'site_robot_tool_modal_content',
                                        'name' => 'tr_site_robot_modal_content'
                                    ),
                                    'forward' => array(
                                        'module' => 'MelisCmsSiteRobot',
                                        'controller' => 'ToolSiteRobot',
                                        'action' => 'tool-modal-content',
                                        'jscallback' => '',
                                        'jsdatas' => array()
                                    ),
                                )
                            )
                        ),
                    ),

                ),
            ),
        ),
        // end tool config
    ),
);
