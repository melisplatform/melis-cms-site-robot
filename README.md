# Melis CMS Site Robot  

MelisCmsSiteRobot provides a functionality to add robots.txt on each domain.

## Getting Started  

These instructions will get you a copy of the project up and running on your machine.  

## Prerequisites  

You will need to install melisplatform/melis-engine in order to have this module running. 

### Database  

Database model is accessible on the MySQL Workbench file:  
/melis-cms-site-robot/install/sql/Model  
In case of problems, SQL files are located here:  
/melis-cms-site-robot/install/sql

## Tools & Elements provided  

* Access to Robots.txt list for each domain
* Manage of robots.txt contents for each domain

## Running the code  

Retrieve data for MelisCmsSiteRobot:

// Get MelisEngineTableSiteDomain service
$table = $this->getServiceLocator()->get('MelisEngineTableSiteDomain');

// Get all data from site domain table.
$data = $table->getData($searchValue, $searchableCols, $selColOrder, $orderDirection, $start, $length)->toArray();


// Get MelisEngineTableRobot service
$robotTable = $this->getServiceLocator()->get('MelisEngineTableRobot');

//Get robots.txt contents and data for each domain
$robotData  = (array) $robotTable->getEntryByField('robot_site_domain', $domainName)->current();


## Special URL  

Setting Robots.txt route:
```
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
```