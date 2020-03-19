/* UTILS and SERVICE CLASSES*/

/* global vars storing key names of currency object properties (as it returns an external API) */
var key_symbol = "symbol";
var key_description = "name";
var key_id = "id";

/* asynchrony waiting for provided number of miliseconds 
return value - a Promise that will be resoved in the provided number of miliseconds
*/
function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/* Return Min:Sec text patern of the current time */
function getMinSecOfNow(){
    let d = new Date;
    let time_parts = d.toTimeString().split(' ')[0].split(':');
    return `${time_parts[1]}:${time_parts[2]}`
}

/* Class that provide all functionality that relates to work with Storage object

This class uses the sessionStorage object for data storing 
(you can change it to use the localStorage object or in memory-object, or cache obje instead)

All properies and methods are static so could be used without calling "new" operator */
class SiteStorage{

    /* all key names that are used in the class for data processing */
    static key_all_menu_items = "all_menu_items";
    static key_current_menu_item = "current_menu_item";
    static key_toggled_list = 'toggled_list';
    static key_menu_item_template = 'menu_item_template';
    static key_all_loaded = 'all_loaded_currencies';
    static key_replace_currency = 'replace_currency';

    /* Save in the storage a list of all menu items have been read from teh main.json*/
    static storeAllMenuItems(items){
        SiteStorage.set_item(SiteStorage.key_all_menu_items, items);
    }
    /* Read from the storage a list of all menu items*/
    static getAllMenuItems(){
        return SiteStorage.get_item(SiteStorage.key_all_menu_items);
    }

    /* Save in the storage a special object that contains info what new toggled currency with what old toggled currency should be replaced */
    static storeReplaceCurrency(item){
        SiteStorage.set_item(SiteStorage.key_replace_currency, item);
    }

    /* Get from the storage a special object that contains info what new toggled currency with what old toggled currency should be replaced */
    static getReplaceCurrency(){
        return SiteStorage.get_item(SiteStorage.key_replace_currency);
    }

    /* Remove from the storage a special object that contains info what new toggled currency with what old toggled currency should be replaced */
    static removeReplaceCurrency(){
        return SiteStorage.remove_item(SiteStorage.key_replace_currency);
    }

    /* Save in the storage a list of all toggled currency IDs */
    static storeToggled(items){
        return SiteStorage.set_item(SiteStorage.key_toggled_list, items);
    }
    
    /* Get from the storage a list of all toggled currency IDs */
    static getToggled(){
        return SiteStorage.get_item(SiteStorage.key_toggled_list, []);
    }

    /* Save in the storage the current menu item related data */
    static storeCurrentMenuItem(menu_item_obj){
        SiteStorage.set_item(SiteStorage.key_current_menu_item, menu_item_obj);
    }

    /* Get from the storage the current menu item related data */
    static getCurrentMenuItem(){
        return SiteStorage.get_item(SiteStorage.key_current_menu_item);
    }
    
    /* Remeove from the storage the current menu item related data */
    static removeCurrentMenuItem(){
        SiteStorage.remove_item(SiteStorage.key_current_menu_item);
    }

    /* storing data to the storage */
    static set_item(key, item_obj){
        sessionStorage.setItem(key, JSON.stringify(item_obj));
    }

    /* reading data to the storage */
    static get_item(key, default_value){
        let stored_item = sessionStorage.getItem(key);
        if (stored_item) {
            return JSON.parse(stored_item);
        }else{
            return default_value;
        }
    }

    /* removing data to the storage */
    static remove_item(key){
        sessionStorage.removeItem(key);
    }

    /* clearing the storage */
    static clear(){
        sessionStorage.clear();
    }
}


/* Class that provides all functionality to work with toggled currencies 
All properies and methods are static so could be used without calling "new" operator */
class ToggledCurrencies{
    /* an internal list to store IDs of all toggled currencies */
    static list_of_toggled_currencies = undefined;

    /* Check if list of toggled currencies contains provided in a parameter the currency id */
    static contains(id){
        return ToggledCurrencies.get_list_of_toggled_currencies().includes(id);
    }

    /* return the list of the toggled currency ids */
    static get_list_of_toggled_currencies(){

        if (ToggledCurrencies.list_of_toggled_currencies == undefined){
            /* if it's the first time when this method has been called 
            then the list has the initial undefined value
            so we will try to get it from the storage
            (by default an empty list is returned) */
            ToggledCurrencies.list_of_toggled_currencies = SiteStorage.getToggled();
        }
        return ToggledCurrencies.list_of_toggled_currencies;
    }

    /* set a new list  as the list of toggled currency IDs */
    static set_list_of_toggled_currencies(some_list){
        ToggledCurrencies.list_of_toggled_currencies = some_list;
        ToggledCurrencies.save()
    }

    /* add to the list of the toggled currency IDs a new ID  */
    static add_currency_id(id){
        if (!ToggledCurrencies.contains(id)){
            ToggledCurrencies.list_of_toggled_currencies.push(id); 
            ToggledCurrencies.save();         
        }
    }

    /* remove from the list of the toggled currency IDs the specified in a parameter the ID value */
    static remove_currency_id(id){
        if (ToggledCurrencies.contains(id)){
            ToggledCurrencies.list_of_toggled_currencies = ToggledCurrencies.list_of_toggled_currencies.filter(stored_id => stored_id != id); 
            ToggledCurrencies.save();         
        }
    }

    /* save in the storage the list of the toggled currency IDs */
    static save(){
        SiteStorage.storeToggled(ToggledCurrencies.list_of_toggled_currencies);
    }

    /* return the current length of the list of the toggled currency IDs */
    static length(){
        return ToggledCurrencies.get_list_of_toggled_currencies().length;
    }

    /* clear the list of the toggled currency IDs (remove all IDs from it - empty list) */
    static clear(){
        ToggledCurrencies.set_list_of_toggled_currencies([])
    }
}