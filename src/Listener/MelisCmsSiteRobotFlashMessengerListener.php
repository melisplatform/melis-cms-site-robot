<?php

/**
 * Melis Technology (http://www.melistechnology.com)
 *
 * @copyright Copyright (c) 2016 Melis Technology (http://www.melistechnology.com)
 *
 */

namespace MelisCmsSiteRobot\Listener;


use MelisCore\Listener\MelisGeneralListener;
use Laminas\EventManager\EventManagerInterface;
use Laminas\EventManager\ListenerAggregateInterface;

/**
 * This listener listens to MelisCmsSiteDomain events in order to add entries in the
 * flash messenger
 */
class MelisCmsSiteRobotFlashMessengerListener extends MelisGeneralListener implements ListenerAggregateInterface
{
    /**
     * MelisCmsSiteDomain/src/MelisCmsSiteDomain/Listener/MelisCmsSiteDomainFlashMessengerListener.php
     * Handles the flash messenger event listener
     * @param EventManagerInterface $events
     */
    public function attach(EventManagerInterface $events, $priority = 1)
    {
        $sharedEvents = $events->getSharedManager();
        // identifier
        $identifier = "MelisCmsSiteRobot";
        // eventsName
        $eventsName = [
            'melis_domain_flash_messenger',
            'site_robot_flash_messenger'
        ];
        // priority
        $priority= -1000;    

        /**
         * attaching events listeners
         */
        $this->attachEventListener($events, $identifier, $eventsName,
            function ($e) {
                $params = $e->getParams();
                $params['textTitle'] = $params['title'];
                $params['textMessage'] = $params['message'];
                $e->getTarget()->forward()->dispatch(
                    'MelisCore\Controller\MelisFlashMessenger',
                    array_merge(['action' => 'log'], $params)
                )->getVariables();
            },
            $priority
        );
    }
}
