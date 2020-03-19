/*global vars - for quick access to main dialogs of the site */
var wait_dialog;
var error_dialog;
var error_message;

/* the global var that will contain a key of the first menu item that has been read from the main.json
the "home" value is expected*/
var first_menu_key = "";

/* the global var that control price updating in a chart on the Live Reports page*/
var permit_price_updating = false;

/*site initializing */
$(document).ready(function(){ 
    //run intial actions on site
    initiateMain();  
    
    //get data from the main.json
    fetch("data/main.json").then(response => {
        return response.json();
    }).then(data => {
        //get set of menu items 
        let menu_items = data[SiteStorage.key_all_menu_items];
        SiteStorage.storeAllMenuItems(menu_items);
        let menu_keys =  Object.keys(menu_items);
        
        //get HTML-template of a menu item
        let menu_items_html = "";
        let menu_item_template = data[SiteStorage.key_menu_item_template];
        
        //add  menu items to site HTML
        first_menu_key = ""
        menu_keys.forEach(key => {
            if (!first_menu_key) first_menu_key = key
            let menu_obj = menu_items[key];
            menu_items_html += menu_item_template
                                .replace('-MenuKey-',key)
                                .replace('-MenuTooltip-',menu_obj.tooltip)
                                .replace('-MenuName-', menu_obj.name);
        })
        $("#menu").html(menu_items_html);
        $("#container").text("");

        //link events and handlers
        $('a.menu_item').on('click', menuItemClicked);
        $('#filter_toggled').on('click', filterToggled);
        //link submit event to function that just prevent handling this event
        $('#search_form').on('submit', function(e){
            e.preventDefault();
        });
        $('#search_code').on('input', function(){
            filterByCode(false);
        });
        $('#search_button').on('click', function(){
            filterByCode(true);
        });
        //show the first menu item related page
        loadMenuItem(first_menu_key);
    })
});

/* run initial actions on site */
function initiateMain(){
    SiteStorage.clear();

    /* initial configuring all main dialogs */
    wait_dialog = $("#loader_ring");
    
    error_dialog = $("#error_dialog");
    error_dialog.dialog({ 
        autoOpen: false, 
        modal:true,
        resize: "auto",
        show: {
            effect: "highlight",
            duration: 500
        },
        hide: {
            effect: "fold",
            duration: 1000
        },
        buttons: {
            OK: function() {
              $( this ).dialog( "close" );
            }
        }
    });
    error_message = $("#error_message");
}

/* Handling the click event of menu items */
function menuItemClicked(e){
    e.preventDefault();    
    loadMenuItem(e.target.id)
}

/* show the clicked menu item related page */
function loadMenuItem(menu_item_key){
    let previous_menu_item = SiteStorage.getCurrentMenuItem();
    if (previous_menu_item){
        if (previous_menu_item.key == menu_item_key) {
            /* if the previous menu item and the new clicked menu item are the same item
            then we do nothing */
            return;
        }
        deactivateMenu(previous_menu_item);
    }
    showLoaderDiv();
    permit_price_updating = false;
    let menu_items = SiteStorage.getAllMenuItems();
    let menu_item = menu_items[menu_item_key];
    /* get the menu item related json */
    fetch(`data/${menu_item.my_src}.json`).then(response => {
        return response.json();
    }).then(menu_item_data => {
        /* save all current menu related data in the storage */
        let current_menu_item = {
            "key": menu_item_key,
            "item": menu_item,
            "data": menu_item_data
        }
        SiteStorage.storeCurrentMenuItem(current_menu_item);
        /* try to show menu page if it already existing */
        let menu_container_exists = activateMenu(current_menu_item);
        if (!menu_container_exists){
            /* if menu page is not existing yet */
            $("#container").append(menu_item_data.html_template);
            /* if menu related json contains not empty value of the "menu_load_function" key */
            if (menu_item_data.menu_load_function) {
                /* find in the scripts a function with a name that is set in the "menu_load_function" key */
                let load_page_func = window[menu_item_data.menu_load_function];
                let error = load_page_func(menu_item_key, menu_item_data, hideLoaderDiv);
                
                if (error){
                    hideLoaderDiv();
                    showError('ERROR!', error, reloadSite);
                    removeMenuContainer(menu_item_data.parent_container_id);
                }
            }    
        }else{
            /* if menu page exists */
            /* if menu related json contains not empty value of the "refresh_function" key */
            if (menu_item_data.refresh_function) {
                /* find in the scripts a function with a name that is set in the "refresh_function" key */
                let refresh_page_func = window[menu_item_data.refresh_function];
                refresh_page_func(menu_item_data);
            } 
            hideLoaderDiv();
        }
    })
}

/* Hide menu related page (some div in the site HTML)  */
function deactivateMenu(menu_item){
    $('#'+menu_item.data.parent_container_id).hide();
}

/* Show menu related page (some div in the site HTML) if such exists 
return value - boolean sign: true - manu page is found, false - menu page was not found
*/
function activateMenu(menu_item){
    if ($('#'+menu_item.data.parent_container_id).length ){
        $('#'+menu_item.data.parent_container_id).show();
        return true;
    }
    return false;
}

/* Hide the Search/Filter currency related widgets */
function hideSearch(){
    $('#search_form').hide();
}

/* Show the Search/Filter currency related widgets */
function showSearch(){
    $('#search_form').show();
}

/* Show Error dialog 
parameters:
title - string of the title (a calling function should define it)
message - string of the message (a calling function should define it)
callOnClose - function that should be called on closing this dialog (a calling function should define it)
*/
function showError(title, message, callOnClose){
    error_message.text(message);
    error_dialog.dialog("option","title", title);
    if (callOnClose != undefined)
        error_dialog.dialog("option","close", callOnClose);
    error_dialog.dialog("open");
}

/* Show Loader Div */
function showLoaderDiv(){
    wait_dialog.show();
}

/* Hide Loader Div */
function hideLoaderDiv(){
    wait_dialog.hide();
}

/* Show the first menu item related page */
function reloadSite(){
    loadMenuItem(first_menu_key);
}

/* this function could be used as a not empty callback function that does nothing*/
function emptyFunction(){
    return;
}

/* Handling click event of the Filter Toggled widget */
async function filterToggled(){
    $('#search_code').val("");
    let filter_on = $('#filter_toggled').prop('checked');
    let count_of_shown = 0;
    let count_of_processed = 0;
    $('.card').each(function(){
        count_of_processed++;
        let card = $(this);
        if (filter_on) {
            let child_input = card.find('input.currency_checkbox');
            if (!child_input.prop('checked')){
                card.hide();
            }else{
                card.show();
                count_of_shown++;
            }
        }else{
            card.show();
            count_of_shown++;
        }
    }); 
    if (count_of_processed > 0 && count_of_shown == 0){
        //not effective filtering, let's turn it off
        $('#filter_toggled').prop('checked', false);
        filterToggled();
    }
}

/* Handling the "input" event of the Search code input widget */
async function filterByCode(with_warning){
    $('#filter_toggled').prop('checked', false);
    let curency_symbol = $('#search_code').val().toUpperCase();
    let filter_on = (curency_symbol.length > 2);
    $('.card').each(function(){
        let card = $(this);
        if (filter_on) {
            let child_el = card.find('h4');
            if (child_el.text().toUpperCase().indexOf(curency_symbol) != -1){
                card.show();
            }else{
                card.hide();
            }
        }else{
            card.show();
        }
    });
    if (with_warning && curency_symbol.length>0 && curency_symbol.length<3){
        showError('INFO!','Enter at least 3 chars to start filter!', emptyFunction);
    }
}

/* Re-Applies not empty filters to the list of currencies  */
async function updateFilters(){
    if ($('#filter_toggled').prop('checked')){
        filterToggled(false);
    }else if ($('#search_code').val().length >2){
        filterByCode(false);
    }
}

/* Remove menu page from site HTML by ID*/
function removeMenuContainer(id){
    $('#'+id).remove();
}