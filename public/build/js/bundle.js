$(function() {
    var $body       = $("body"),
        // the zone ID of the modal content in the app.interface
        zoneId      = "id_site_robot_tool_modal_content",
        // the melisKey of the modal content in the app.interface
        melisKey    = "site_robot_tool_modal_content",
        // the URL of the modal container
        modalUrl    = "/melis/MelisCmsSiteRobot/ToolSiteRobot/toolModalContainer";

        /**
         * module/MelisSiteRobot/public/js/site-robot.tools.js
         * Handles the event that will launch a modal with the data selected
         */
        $body.on("click", ".btn-edit-domain", function() {
            var $this   = $(this),
                id      = $this.parents("tr").attr("id");

                window.parent.melisHelper.createModal(zoneId, melisKey, false, {id: id}, modalUrl, function() {
                    melisCoreTool.done(".btn-edit-domain");
                });
        });

        // Reload datatable on robot site selection
        $body.on("change", "#robotSiteSelect", function(){
            var $this   = $(this),
                tableId = $this.parents().eq(6).find('table').attr('id');

                $("#"+tableId).DataTable().ajax.reload();
        });

        /**
         * module/MelisSiteRobot/public/js/site-robot.tools.js
         * Handles an event for saving an domain
         */
        $body.on("submit", "form#id_site_robot_form", function(e) {
            var formData = new FormData(this);

                melisCoreTool.pending("#btn-save-site-robot");

                $.ajax({
                    type    : 'POST',
                    url     : '/melis/MelisCmsSiteRobot/ToolSiteRobot/saveSiteRobot',
                    data    : formData,
                    processData : false,
                    cache       : false,
                    contentType : false,
                    dataType    : 'json',
                }).done(function(data){
                    if(data.success) {
                        $("div.modal").modal("hide");
                        // triggers the refresh button in the filter bar
                        $("#" + activeTabId + " .melis-refreshTable").trigger("click");
                        melisHelper.melisOkNotification(data.title, data.message);
                    }
                    else {
                        melisHelper.melisKoNotification(data.title, data.message, data.errors);
                    }
                    // update flash messenger component
                    melisCore.flashMessenger();
                    melisCoreTool.done("#btn-save-site-robot");
                }).fail(function(){
                    melisCoreTool.done("#btn-save-site-robot");
                    alert( translations.tr_meliscore_error_message );
                });

                e.preventDefault();
        });
});

// get data from site dropdown select
window.initSiteList = function(data, tblSettings){
    if ( $('#robotSiteSelect').length ) {
        data.tpl_site_id = $('#robotSiteSelect').val();
    } 
}

// paginate dataTables data
window.paginateDataTables = function() {
    melisCore.paginateDataTables();
}