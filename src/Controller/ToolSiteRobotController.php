<?php
/**
 * Melis Technology (http://www.melistechnology.com)
 *
 * @copyright Copyright (c) 2017 Melis Technology (http://www.melistechnology.com)
 * 
 */

namespace MelisCmsSiteRobot\Controller;

use Zend\Mvc\Controller\AbstractActionController;
use Zend\View\Model\ViewModel;
use Zend\View\Model\JsonModel;

class ToolSiteRobotController extends AbstractActionController
{
    const TOOL_KEY = 'meliscms_tool_site_robot';
    const TOOL_INDEX = 'meliscms';

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles the retrieval of robots text
     * @return ViewModel
     */
    public function toolRobotsTxtAction()
    {
        $request = $this->getRequest();
        $uri     = $request->getUri();
        $host    = $uri->getHost();
        $content = null;

        $table = $this->robotTable();
        $data  = $table->getEntryByField('robot_site_domain', $host)->current();

        if ($data) {
            $content = $data->robot_text;
        }  
        $view = new ViewModel();
        $view->setTerminal(true);
        $view->content = $content;

        return $view;
    }
    
    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Main container
     * @return ViewModel
     */
    public function toolContainerAction()
    {
        $melisKey = $this->getMelisKey();

        $view = new ViewModel();
        $view->melisKey = $melisKey;

        return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Displays Header container
     * @return ViewModel
     */
    public function toolHeaderContainerAction()
    {
        $melisKey = $this->getMelisKey();
        $translator = $this->getServiceLocator()->get('translator');
        $view = new ViewModel();
        $view->melisKey = $melisKey;
        $view->title = $translator->translate('tr_site_robot_tool_display_title');
        $view->description = $translator->translate('tr_site_robot_description');

        return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Display contents
     * @return ViewModel
     */
    public function toolContentContainerAction()
    {
        $melisKey = $this->getMelisKey();
        $translator = $this->getServiceLocator()->get('translator');
        $columns = $this->getTool()->getColumns();
        $columns['actions'] = array('text' =>  $translator->translate('tr_site_robot_column_action'), 'width' => '10%');
        
        $view = new ViewModel();
        $view->tableColumns = $columns;
        $view->melisKey = $melisKey;
        $view->getToolDataTableConfig = $this->getTool()->getDataTableConfiguration('#tableSiteRobot', true);

        return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles the display of the select element on the table
     * @return ViewModel
     */
    public function toolContentTableLimitAction()
    {
        return new ViewModel();
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles the display of the search input on the table
     * @return ViewModel
     */
    public function toolContentTableSearchAction()
    {
        return new ViewModel();
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles the display of the search input on the table
     * @return ViewModel
     */
    public function toolContentTableRefreshAction()
    {
        return new ViewModel();
    }

    /**
     * Handles the display of the edit button in the table
     * @return ViewModel
     */
    public function toolContentTableActionEditAction()
    {
        return new ViewModel();
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles the display of the delete button in the table
     * @return ViewModel
     */
    public function toolContentTableActionDeleteAction()
    {
        return new ViewModel();
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Handles modal container
     * @return ViewModel
     */
    public function toolModalContainerAction()
    {
        $id = $this->params()->fromRoute('id', $this->params()->fromQuery('id', ''));
        $melisKey = $this->getMelisKey();
        $view = new ViewModel();
        $view->setTerminal(false);
        $view->melisKey = $melisKey;
        $view->id = $id;

        return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Display modal form
     * @return ViewModel
     */
    public function toolModalContentAction()
    {
        $id = $this->params()->fromRoute('id', $this->params()->fromQuery('id', ''));
        $translator = $this->getServiceLocator()->get('translator');
        $melisKey = $this->params()->fromRoute('melisKey', '');
        $title    = $translator->translate('tr_site_robot_edit');
        $data     = array();

        $table = $this->siteDomainTable();
        $data = (array) $table->getEntryById((int) $id)->current();
       
        $robotData = '';
         
        // get robot text from domain
        if (!empty($data)) {
            $robotTable = $this->robotTable();
            $domainName = isset($data['sdom_domain']) ? $data['sdom_domain'] : '';
            $robotData  = (array) $robotTable->getEntryByField('robot_site_domain', $domainName)->current();

            $data['robot_text'] = isset($robotData['robot_text']) ? $robotData['robot_text'] : '';
        }

        $form  = $this->getDomainForm();

        if ($data) {
            $form->setData($data);
        }

        $view = new ViewModel();

        $view->melisKey = $melisKey;
        $view->title    = $title;
        $view->form     = $form;
        $view->desc = $translator->translate('tr_site_robot_modal_description');

        return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Renders to the "Add Button" display in the headers
     * @return ViewModel
     */
    public function toolHeaderAddButtonAction()
    {
        $melisKey = $this->getMelisKey();

        $view = new ViewModel();
        $view->melisKey = $melisKey;
        return $view;
    }

   /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Get/Dispplay data
     * @return json response
     */
    public function getSiteRobotDataAction()
    {
        $request = $this->getRequest();
        $dataCount = 0;
        $dataFilteredCount = 0;
        $tableData = array();
        $draw = 0;

        if($request->isPost()) {

            $post    = get_object_vars($request->getPost());
            $columns = array_keys($this->getTool()->getColumns());
            $draw           = (int) $post['draw'];
            $selColOrder    = $columns[(int) $post['order'][0]['column']];
            $orderDirection = isset($post['order']['0']['dir']) ? strtoupper($post['order']['0']['dir']) : 'ASC';
            $searchValue    = isset($post['search']['value']) ? $post['search']['value'] : null;
            $searchableCols = $this->getTool()->getSearchableColumns();
            $start          = (int) $post['start'];
            $length         = (int) $post['length'];
            $siteId         = isset($post['tpl_site_id']) ? $post['tpl_site_id'] : null;

            $table = $this->siteDomainTable();
            $data = $table->getData($searchValue, $searchableCols, $selColOrder, $orderDirection, $start, $length, $siteId)->toArray();
            $dataCount = $table->getTotalData();
            $dataFilteredCount = $table->getTotalFiltered();
            $tableData = $data;

            for($ctr = 0; $ctr < count($tableData); $ctr++) {
                // apply text limits
                foreach($tableData[$ctr] as $vKey => $vValue)
                {
                    $tableData[$ctr][$vKey] = $this->getTool()->limitedText($vValue, 80);
                }

                $sdomId = isset($tableData[$ctr]['sdom_id']) ? $tableData[$ctr]['sdom_id'] : '';
                $tableData[$ctr]['DT_RowId'] = $sdomId;
            }
        }

        $response = [
            'draw' => $draw,
            'data' => $tableData,
            'recordsFiltered' => $dataFilteredCount,
            'recordsTotal' => $dataCount
        ];

        return new JsonModel($response);
    }

    /**
     * Renders to the site filter selection in the filter bar in the datatable
     * @return \Zend\View\Model\ViewModel
     */
    public function toolSiteRobotContentFiltersSitesAction()
    {
        $translator = $this->getServiceLocator()->get('translator');
        $siteTable = $this->getServiceLocator()->get('MelisEngineTableSite');
        
        $sites = array();
        $sites[] = '<option value="">'. $translator->translate('tr_site_robot_label_choose') .'</option>';
       
       foreach($siteTable->fetchAll() as $site){
           $sites[] = '<option value="'.$site->site_id.'">'. $site->site_name .'</option>';
       }
       
       $view = new ViewModel();
       $view->sites = $sites;
       return $view;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Save data
     * @return json response
     */
    public function saveSiteRobotAction()
    {
        $success = 0;
        $message = 'tr_site_robot_save_ko';
        $title   = 'tr_site_robot_tool_display_title';
        $errors  = array();
        $request = $this->getRequest();
        $translator = $this->getServiceLocator()->get('translator');

        if($request->isPost()) {

            $post = get_object_vars($request->getPost());
            $form = $this->getDomainForm();
            $form->setData($post);

            if($form->isValid()) {
                $data = $form->getData();
                $data['robot_site_domain'] = $data['sdom_domain'];
                unset($data['sdom_domain']);

                $table = $this->robotTable();
                $robotData  = (array) $table->getEntryByField('robot_site_domain', $data['robot_site_domain'])->current();
                
                $id = '';

                if ($data) {
                    $id = isset($robotData['robot_id']) ? (int) $robotData['robot_id'] : null;
                }
                $success = $table->save($data, $id);
                
                if($success) {
                    $success = 1;
                    $message = 'tr_site_robot_save_ok';
                }
            } else {
                $errors = $this->formatErrorMessage($form->getMessages());
            }
        }

        $response = array(
            'success' => $success,
            'title'   => $translator->translate($title),
            'message' => $translator->translate($message),
            'errors'  => $errors
        );

        // add to flash messenger
        $this->getEventManager()->trigger('site_robot_flash_messenger', $this, $response);

        return new JsonModel($response);
    }

    /*********Private Functions************/

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Error formatting
     * @return errors
     */
    private function formatErrorMessage($errors = array())
    {
        $melisMelisCoreConfig = $this->serviceLocator->get('MelisCoreConfig');
        $appConfigForm = $melisMelisCoreConfig->getItem('melissiterobot/tools/melissiterobot_tool_templates/forms/site_robot_form');
        $appConfigForm = $appConfigForm['elements'];

        foreach ($errors as $keyError => $valueError)
        {
            foreach ($appConfigForm as $keyForm => $valueForm)
            {
                if ($valueForm['spec']['name'] == $keyError &&
                    !empty($valueForm['spec']['options']['label']))
                    $errors[$keyError]['label'] = $valueForm['spec']['options']['label'];
            }
        }

        return $errors;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Returns the melisKey of the view that is being set in app.interface
     * @return mixed
     */
    private function getMelisKey()
    {
        $melisKey = $this->params()->fromRoute('melisKey', $this->params()->fromQuery('melisKey'), null);

        return $melisKey;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Returns the Melis Core Tool service instead
     * of re-declaring the object multiple times
     * @return array|object
     */
    private function getTool()
    {
        $toolSvc = $this->getServiceLocator()->get('MelisCoreTool');
        $toolSvc->setMelisToolKey('melis_cms_site_robots', 'melissiterobot_tool_templates');
      
        return $toolSvc;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Get from from config
     *
     * @return array|object
     */
    private function getDomainForm()
    {
        $form = $this->getTool()->getForm('site_robot_form');
        return $form;
    }

    /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Get table service for MelisEngineTableRobot
     *
     * @return array|object
     */
    private function robotTable()
    {
        $table = $this->getServiceLocator()->get('MelisEngineTableRobot');
        
        return $table;
    }

     /**
     * MelisCmsSiteRobot/src/MelisCmsSiteRobot/Controller/ToolSiteRobotController.php
     * Get table service for MelisEngineTableSite
     *
     * @return array|object
     */
    private function siteDomainTable()
    {
        $table = $this->getServiceLocator()->get('MelisEngineTableSiteDomain');
        
        return $table;
    }
}