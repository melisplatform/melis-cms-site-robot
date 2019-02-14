<?php

return array(
    'plugins' => array(
        'melis_cms_site_robots' => array(
            'tools' => array(
                // domain tool table
                'melissiterobot_tool_templates' => array(
                    'conf' => array(),
                    'table' => array(
                        // the table that will render the data
                        'target' => '#tableSiteRobot',
                        // the url that will return the JSON domain data
                        'ajaxUrl' => '/melis/MelisCmsSiteRobot/ToolSiteRobot/getSiteRobotData',
                        // additional request parameters, this should be a javascript function
                        'dataFunction' => 'initSiteList',
                        // the callback event that will be called after table rendering
                        'ajaxCallback' => '',
                        'filters' => array(
                            'left' => array(
                                'limit' => array(
                                    'module' => 'MelisCmsSiteRobot',
                                    'controller' => 'ToolSiteRobot',
                                    'action' => 'tool-content-table-limit',
                                ),
                                'choose-sites' => array(
                                    'module' => 'MelisCmsSiteRobot',
                                    'controller' => 'ToolSiteRobot',
                                    'action' => 'tool-site-robot-content-filters-sites',
                                ),
                            ),
                            'center' => array(
                                'search' => array(
                                    'module' => 'MelisCmsSiteRobot',
                                    'controller' => 'ToolSiteRobot',
                                    'action' => 'tool-content-table-search',
                                ),
                            ),
                            'right' => array(
                                'refresh' => array(
                                    'module' => 'MelisCmsSiteRobot',
                                    'controller' => 'ToolSiteRobot',
                                    'action' => 'tool-content-table-refresh',
                                ),
                            ),

                        ),
                        'columns' => array(
                            // the key should be the actual column name of the table
                            'sdom_id' => array(
                                // text that will be displayed on the table
                                'text' => 'tr_sdom_id',
                                // the width of the column
                                'css'  => array('width' => '20%', 'padding-right' => 0),
                                // if true, then the column is sortable to ASC or DESC
                                'sortable' => true
                            ),
                            'site_label' => array(
                                'text' => 'tr_site_name',
                                'css'  => array('width' => '20%', 'padding-right' => 0),
                                'sortable' => true
                            ),
                            'sdom_domain' => array(
                                'text' => 'tr_sdom_domain',
                                'css'  => array('width' => '30%', 'padding-right' => 0),
                                'sortable' => true
                            ),

                            // NOTE: the total width that has been set should not go more than 90%,
                            // because the 10% is reserved to the action column where the buttons will be displayed
                        ),
                        // Set what columns that will be used when searching
                        'searchables' => array('sdom_id', 'site_name', 'sdom_domain'),
                        // this wi
                        'actionButtons' => array(
                            // this configuration adds a button to the action column inside the table
                            'edit' => array(
                                'module' => 'MelisCmsSiteRobot',
                                'controller' => 'ToolSiteRobot',
                                'action' => 'tool-content-table-action-edit',
                            ),
                        ),

                        'modals' => array( // handles the contents of the modals
                            'site_robot_tool_prospects_empty_modal' => array(
                                'id' => 'id_site_robot_tool_prospects_empty_modal',
                                'class' => 'glyphicons pencil',
                                'tab-header' => '',
                                'tab-text' => 'tr_site_robot_tool_prospects',
                                'content' => array(
                                    'module' => 'MelisCmsSiteRobot',
                                    'controller' => 'ToolSiteRobot',
                                    'action' => 'render-site-robot-tool-update-form',
                                ),
                        ),
                    ), // end modals
                    ),
                    // end domainTool  table
                        'forms' => array(
                        // domain form
                        'site_robot_form' => array(
                            'attributes' => array(
                                'name' => 'site_robot_form',
                                'id' => 'id_site_robot_form',
                                'method' => 'POST',
                                'action' => '',
                            ),
                            'hydrator'  => 'Zend\Stdlib\Hydrator\ArraySerializable',
                            'elements' => array(
                                array(
                                    'spec' => array(
                                        'name' => 'sdom_domain',
                                        'type' => 'text',
                                        'options' => array(
                                            'label' => 'tr_sdom_domain_modal',
                                            'tooltip' => 'tr_sdom_domain_modal tooltip',
                                        ),
                                        'attributes' => array(
                                            'id' => 'sdom_domain',
                                            'value' => '',
                                            'class' => 'form-control',
                                            //'placeholder' => 'tr_sdom_domain',
                                            'readonly' => 'true',
                                        ),
                                    ),
                                ),
                                array(
                                    'spec' => array(
                                        'name' => 'robot_text',
                                        'type' => 'Textarea',
                                        'options' => array(
                                            'label' => 'tr_robot_text',
                                            'tooltip' => 'tr_robot_text tooltip',
                                        ),
                                        'attributes' => array(
                                            'id' => 'robot_text',
                                            'value' => '',
                                            'class' => 'form-control',
                                            'rows' => 15,
                                            //'placeholder' => 'tr_sdom_domain',
                                        ),
                                    ),
                                ),
                            ),
                            'input_filter' => array(
                            ),
                        ),
                    ),
                    // end domain tool forms
                ),
                // end domain 
            ),
        ),
    ),
);