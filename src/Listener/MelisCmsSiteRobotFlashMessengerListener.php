<?php

/**
 * Melis Technology (http://www.melistechnology.com)
 *
 * @copyright Copyright (c) 2016 Melis Technology (http://www.melistechnology.com)
 *
 */

namespace MelisCmsSiteRobot\Listener;


use MelisCore\Listener\MelisCoreGeneralListener;
use Zend\EventManager\EventManagerInterface;
use Zend\EventManager\ListenerAggregateInterface;

/**
 * This listener listens to MelisCmsSiteDomain events in order to add entries in the
 * flash messenger
 */
class MelisCmsSiteRobotFlashMessengerListener extends MelisCoreGeneralListener implements ListenerAggregateInterface
{
    /**
     * MelisCmsSiteDomain/src/MelisCmsSiteDomain/Listener/MelisCmsSiteDomainFlashMessengerListener.php
     * Handles the flash messenger event listener
     * @param EventManagerInterface $events
     */
    public function attach(EventManagerInterface $events)
    {
        $sharedEvents = $events->getSharedManager();

        $callBackHandler = $sharedEvents->attach(
            'MelisCmsSiteRobot',
            [
                'melis_domain_flash_messenger',
                'site_robot_flash_messenger'
            ],
            function ($e) {
                $params = $e->getParams();
                $params['textTitle'] = $params['title'];
                $params['textMessage'] = $params['message'];
                $e->getTarget()->forward()->dispatch(
                    'MelisCore\Controller\MelisFlashMessenger',
                    array_merge(['action' => 'log'], $params)
                )->getVariables();
            },
            -1000);

        $this->listeners[] = $callBackHandler;
    }
}