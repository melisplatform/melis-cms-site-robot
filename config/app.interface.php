<?php

return array(

    'plugins' => array(
        'meliscore' => array(
            'interface' => array(
                'meliscore_leftmenu' => array(
                    'interface' => array(
                        'meliscore_toolstree' => array(
                           'interface' => array(
                                'meliscms_tools_section' => array(
                                    'interface' => array( 
                                        'melis_cms_site_robots_config' => array(
                                            'conf' => array(
                                                'type' => '/melis_cms_site_robots/interface/site_robot_tool_display',
                                                'name' => 'tr_site_robot_title',
                                            )
                                        ),
                                    ),
                                ), 
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
                'name' => 'tr_site_robot_title',
            ),
            'ressources' => array(
                'css' => array(
                    '/MelisCmsSiteRobot/css/site-robot.style.css',
                ),
                'js' => array(
                    '/MelisCmsSiteRobot/js/site-robot.tool.js',
                )
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
                                // 'site_robot_tool_header_add_button' => array(
                                //     'conf' => array(
                                //         'id'   => 'id_site_robot_tool_header_add_button',
                                //         'name' => 'tr_site_robot_header_add_button',
                                //         'melisKey' => 'site_robot_tool_header_add_button',
                                //     ),
                                //     'forward' => array(
                                //         'module' => 'MelisCmsSiteRobot',
                                //         'controller' => 'ToolSiteRobot',
                                //         'action' => 'tool-header-add-button',
                                //         'jscallback' => '',
                                //         'jsdatas' => array()
                                //     ),
                                // ),
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