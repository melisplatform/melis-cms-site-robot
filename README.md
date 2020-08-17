# Melis CMS Site Robot

MelisCmsSiteRobot provides a functionality to add robots.txt on each domain.

## Getting Started

These instructions will get you a copy of the project up and running on your machine.

### Prerequisites

The following modules need to be installed to have Melis newsletter module run:

- Melis engine

### Installing

Run the composer command:

```
composer require melisplatform/melis-cms-site-robot
```

### Database

Database model is accessible via the MySQL Workbench file:

```
/melis-cms-site-robot/install/sql/Model
```

Database will be installed through composer and its hooks.  
In case of problems, SQL files are located here:

```
/melis-cms-site-robot/install/sql
```

## Tools and elements provided

- Melis CMS site robot tool
- Melis CMS site robot service

### Melis CMS site robot tool

Provides the user the ability to access and manage the Robots.txt of every domain.

### Melis CMS site robot service

- Using the service to retrieve Robots.txt data for each domain:

```
// Get MelisEngineTableSiteDomain service
$table = $this->getServiceManager()->get('MelisEngineTableSiteDomain');

// Get all data from site domain table
$data = $table->getData($searchValue, $searchableCols, $selColOrder, $orderDirection, $start, $length)->toArray();
```

```
// Get MelisEngineTableRobot service
$robotTable = $this->getServiceManager()->get('MelisEngineTableRobot');

//Get robots.txt contents and data for each domain
$robotData  = (array) $robotTable->getEntryByField('robot_site_domain', $domainName)->current();
```

## Authors

- **Melis Technology** - [www.melistechnology.com](https://www.melistechnology.com/)

See also the list of [contributors](https://github.com/melisplatform/melis-cms-site-robot/contributors) who participated in this project.

## License

This project is licensed under the OSL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details
