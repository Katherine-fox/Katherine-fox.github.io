/* call this function when the About page menu item is clickd 
see in teh about.json the key "menu_load_function"
parameters:
menu_item_key - key of the menu item (expected value "about")
menu_item_data - menu item related data (content of the about.json is expected), 
callback_when_done - callback function, that could be called (if it's needed) when performing thi function is done

return value - empty string if all is ok or an error message
*/
function load_about(menu_item_key, menu_item_data, callback_when_done){
    initiateAboutPage();
    callback_when_done();
    return "";
}

/* refresh/provide the initial state of the About page 
see in teh about.json the key "refresh_function"
parameters:
menu_item_data - menu item related data (content of the about.json is expected), 

return value - empty string if all is ok or an error message
*/
async function initiateAboutPage(menu_item_data){
    hideSearch();
}