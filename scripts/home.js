/* call this function when the Home page menu item is clickd 
see in teh home.json the key "menu_load_function"
parameters:
menu_item_key - key of the menu item (expected value "home")
menu_item_data - menu item related data (content of the home.json is expected), 
callback_when_done - callback function, that could be called (if it's needed) when performing thi function is done

return value - empty string if all is ok or an error message
*/
function load_currency_cards(menu_item_key, menu_item_data, callback_when_done){
    
    initiateHomePage(menu_item_data);

    //get data from API
    fetch(menu_item_data.list_all_api).then(response=>{
        return response.json();
    }).then(list_of_currencies=>{
        creatCards(list_of_currencies, menu_item_data).then(()=>{
            $('input.currency_checkbox').on('click', onCurrencyToggled);
            $('button.currency_more_info').on('click', onCurrencyMoreInfo);    
            callback_when_done();
        }); 
    }).catch((error)=>{
        callback_when_done();
        showError('ERROR!',`Error: ${error}\nWe can't load a page!\nPlease, check your connection to Internet\nand then try to refresh this page!`, emptyFunction);
    });
    return "";
}

/* refresh/provide the initial state of the Home page 
see in teh home.json the key "refresh_function"
parameters:
menu_item_data - menu item related data (content of the home.json is expected), 

return value - empty string if all is ok or an error message
*/
async function initiateHomePage(menu_item_data){
    /*     see more info about dialog and effects at https://jqueryui.com/      */
    showSearch();
    
    $("#"+menu_item_data.more_info.container_id).dialog({ 
        autoOpen: false, 
        modal: true,
        resize: "auto",
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        }
    });
    $("#"+menu_item_data.replace_currency.container_id).dialog({ 
        autoOpen: false, 
        modal:true,
        resize: "auto",
        show: {
            effect: "fade",
            duration: 500
        },
        hide: {
            effect: "fade",
            duration: 500
        },
        buttons: {
            Cancel: function() {
              $( this ).dialog( "close" );
            }
        }
    });
    return "";
}

/* Creation of HTML for all fetched currencies
parameters:
list_of_currencies -  list of currency objects
menu_item_data - menu item related data (content of the home.json is expected), 

doesn't return any value
*/
function creatCards(list_of_currencies, menu_item_data){
    return new Promise((resolve, reject)=>{
        let cards_html = '';
        let factly_toggled = [];
        for(let i=0; i < list_of_currencies.length; i++){
            if (menu_item_data.max_count_cards > 0 && (i+1) > menu_item_data.max_count_cards) break;
            let currency_obj = list_of_currencies[i];
            let currency_id = currency_obj[key_id];
            let card_html = menu_item_data.card_template;
            let is_toggled = ToggledCurrencies.contains(currency_id);
            if (is_toggled){
                factly_toggled.push(currency_id);
            }
            cards_html += fillCardTemplate(currency_obj, card_html, is_toggled);
            SiteStorage.set_item(currency_id, currency_obj);
        };
        ToggledCurrencies.set_list_of_toggled_currencies(factly_toggled);
        $('#'+menu_item_data.cards_container_id).html(cards_html);
        resolve();
    });
}

/* Replace in a card HTML template all placeholders to values of the concrete currency object
Any placeholder looks like: -SomeName-
parameters:
currency_obj - a currency object 
card_html - string of an initial HTML template of a card (see HTML of the card template in the home.json in the key "card_template")
is_toggled - boolean sign (true/false) meaning the currency should be toggled

return value - string of card's ready HTML
 */
function fillCardTemplate(currency_obj, card_html, is_toggled){
    let title_re = new RegExp('-CurrencyTitle-', 'ig'); /*find all occurencies ignoring case*/
    let description_re = new RegExp('-CurrencyDescription-', 'ig'); 
    let id_re = new RegExp('-CurrencyID-', 'ig'); 
    let id_value = currency_obj[key_id];
    let toggled_re = new RegExp('-Toggled-', 'ig'); 
    let toggled_value = (is_toggled)? 'checked' : '';

    card_html = card_html.replace(title_re, currency_obj[key_symbol])
    .replace(description_re, currency_obj[key_description])
    .replace(id_re, id_value).replace(toggled_re, toggled_value);
    return card_html;
}

/*Handling the CLICK event of currency-toggle widget 
parameters:
e - the click event object*/
async function onCurrencyToggled(e){
    //this inside this function addressing the clicked DOM-element
    let clicked_currency_id = this.name;
    //this.checked - sign if the currency is toggled by user
    if (this.checked){
        //add this currency id to the list of toggled
        if (!ToggledCurrencies.contains(clicked_currency_id)){
            let home_menu_item = SiteStorage.getCurrentMenuItem();
            if (ToggledCurrencies.length() < home_menu_item.data.max_toggled){
                ToggledCurrencies.add_currency_id(clicked_currency_id);
            }else{
                //show modal window
                e.preventDefault();
                let replace_currency_obj = {candidate: clicked_currency_id, replaced: ""};
                SiteStorage.storeReplaceCurrency(replace_currency_obj);
                await showDialogReplaceOneOfToggled(clicked_currency_id);           
            }                
                //alert(`Show modal dialog for new currency "${clicked_currency_id}"!`)
        }
    }else{
        //remove currency id from the list of toggled
        ToggledCurrencies.remove_currency_id(clicked_currency_id);
        await updateFilters();
    }
}

/*Prepare and show dialog suggesting to replace new one toggled currency with one of the toggled before currencies 
parameters:
clicked_currency_id - id of the new toggled currency
*/
async function showDialogReplaceOneOfToggled(clicked_currency_id){
    let currency_obj = SiteStorage.get_item(clicked_currency_id);
    let home_menu_item = SiteStorage.getCurrentMenuItem();
    let menu_item_data = home_menu_item.data;
    //get DOM element of the replace dialog container
    let container = $("#"+ menu_item_data.replace_currency.container_id);
    //update the Titke of the dialog to represent the new toggled currency
    container.dialog( "option", "title", `Replace ${currency_obj[key_symbol].toUpperCase()} with...` );
    //update "body" of the dialog, set HTML "wait-template"
    container.html(menu_item_data.more_info.template_wait);
    //show dialog
    container.dialog( "open" );
    //call async func and wait when it's done
    await updateHtmlOfDialogReplaceCurrency(menu_item_data);
}

/*Fill the Replace dialog with a list of toggled currencies */
async function updateHtmlOfDialogReplaceCurrency(menu_item_data){
    let cards_html = '';
    ToggledCurrencies.get_list_of_toggled_currencies().forEach(id=>{
        let toggled_obj = SiteStorage.get_item(id);
        cards_html += fillCardTemplate(toggled_obj, menu_item_data.replace_currency.toggled_template);
    })
    let complete_html = menu_item_data.replace_currency.template;
    complete_html = complete_html.replace('-ToggledCurrencies-', cards_html).replace('-MaxToggled-', menu_item_data.max_toggled.toFixed(0));
    let container = $("#"+ menu_item_data.replace_currency.container_id);
    container.html(complete_html);
    $('input.replace_toggled').on('click', onDeclineOneOfToggled);
}

/*Handling the click event in the Replace dialog when some old-toggled currency is clicked*/
async function onDeclineOneOfToggled(e){
    let home_menu_item = SiteStorage.getCurrentMenuItem();
    let menu_item_data = home_menu_item.data;
    let container = $("#"+ menu_item_data.replace_currency.container_id);
    let clicked_currency_id = this.name;
    let replace_currency_obj = SiteStorage.getReplaceCurrency();

    if (this.checked){
        replace_currency_obj['replaced'] = ""
    }else{
        if (replace_currency_obj.replaced){
            $(`input.replace_toggled[name="${replace_currency_obj.replaced}"`).prop('checked',true);
        }
        replace_currency_obj['replaced'] = clicked_currency_id
    }
    SiteStorage.storeReplaceCurrency(replace_currency_obj);
    let replace_butons = {}
    if (replace_currency_obj.replaced){
        let currency_obj = SiteStorage.get_item(replace_currency_obj.replaced);
        replace_butons[`Replace with ${currency_obj.symbol.toUpperCase()}`] = function() {
            $( this ).dialog( "close" );
            doReplaceToggledCurrency();
          }
    }
    replace_butons['Cancel'] = function() {
        $( this ).dialog( "close" );
      }
    container.dialog('option', 'buttons', replace_butons);
}

/*Performs final replacing the new toggled currency with a currency that was selected in the Replace dialog */
async function doReplaceToggledCurrency(){
    let replace_currency_obj = SiteStorage.getReplaceCurrency();
    if (replace_currency_obj.replaced){
        ToggledCurrencies.remove_currency_id(replace_currency_obj.replaced)
        $(`input.currency_checkbox[name="${replace_currency_obj.replaced}"`).prop('checked',false);
    }
    if (replace_currency_obj.candidate){
        ToggledCurrencies.add_currency_id(replace_currency_obj.candidate)
        $(`input.currency_checkbox[name="${replace_currency_obj.candidate}"`).prop('checked',true);
    }
    SiteStorage.removeReplaceCurrency();
}

/*Handling the click event of More info buttons */
async function onCurrencyMoreInfo(e){
    //this inside this function addressing the clicked DOM-element
    let currency_obj = SiteStorage.get_item(this.name);
    let home_menu_item = SiteStorage.getCurrentMenuItem();
    let menu_item_data = home_menu_item.data;
    let container = $("#"+ menu_item_data.more_info.container_id);
    container.dialog( "option", "title", `More info about ${currency_obj[key_symbol].toUpperCase()}...` );
    container.html(menu_item_data.more_info.template_wait)
    container.dialog( "open" );
    try {
        await prepareMoreInfo(currency_obj, menu_item_data);
    } catch (error) {
        alert(error);
        container.dialog( "close" );
    }   
}
/*Prepare and show the More info dialog */
async function prepareMoreInfo(currency_obj, menu_item_data){
    let more_info_html = menu_item_data.more_info.template;
    let more_info_obj = currency_obj.more_info;
    let now = new Date;
    let more_info_date_time;
    if (more_info_obj){
        more_info_date_time = new Date(more_info_obj.datetime);
        //if diff between NOW and a moment when the ore info has been taken more than 120 sec (2 min)
        if (Math.ceil((now - more_info_date_time) / 1000 ) > 120){
            more_info_obj = undefined;
        }
    }
    if (!more_info_obj){
        try {
            more_info_obj = await getMoreInfoFromAPI(currency_obj, menu_item_data)
        } catch (error) {
            throw new Error(error);
        }
        currency_obj['more_info'] = more_info_obj;
        SiteStorage.set_item(currency_obj.id, currency_obj);
    }
    now = new Date;
    more_info_date_time = new Date(more_info_obj.datetime);
    let expire_in_sec = 120 - Math.ceil((now - more_info_date_time) / 1000 );
    more_info_html = more_info_html.replace('-CurrencyImg-', more_info_obj.img_src)
                                .replace('-Prices-', more_info_obj.prices_html)
                                .replace('-DateTime-', expire_in_sec.toFixed(0));
    
    $("#"+ menu_item_data.more_info.container_id).html(more_info_html);
}

/*Fetch data for the MOre info dialog */
async function getMoreInfoFromAPI(currency_obj, menu_item_data){
    let api_url = menu_item_data.more_info.api;
    let id_re = new RegExp('-CurrencyID-', 'ig'); 
    let id_value = currency_obj[key_id];
    api_url = api_url.replace(id_re, id_value);
    let info_obj = undefined
    try {
        let response = await fetch(api_url);
        let data = await response.json();
        /*
        image, 
        "image": {
            "thumb": "https://assets.coingecko.com/coins/images/6925/thumb/44429612.jpeg?1547043298",
            "small": "https://assets.coingecko.com/coins/images/6925/small/44429612.jpeg?1547043298",
            "large": "https://assets.coingecko.com/coins/images/6925/large/44429612.jpeg?1547043298"
        }
        rates 
        "market_data": {
            "current_price": {
                "usd": 0.00083971
                "eur": 0.00073759
                "ils": 0.00313467
            }
        }
        */
        info_obj = {
            img_src: data.image.large,
            prices_html: "",
            datetime: new Date
        };
        let prices_html = "";
        let more_info_prices = menu_item_data.more_info.prices;
        let what_prices = more_info_prices.what;
        Object.keys(what_prices).forEach(price_key=>{
            let price_html = more_info_prices.template;
            let price_code = what_prices[price_key];
            let price_value = data.market_data.current_price[price_key];
            price_value *= more_info_prices.multiplier;
            price_html = price_html.replace('-value-', price_value.toFixed(3))
                                .replace('-from_code-', currency_obj[key_symbol].toUpperCase())
                                .replace('-multiplier-', ''+more_info_prices.multiplier)
                                .replace('-to_symbol-', price_code)
                                .replace('-to_code-', price_key.toUpperCase());
            prices_html += price_html;
        })
        info_obj.prices_html = prices_html;
    } catch (error) {
        throw new Error("We can't load the More Info data!\nPlease, check your connection to Internet\nand then try again!");
    }
    return info_obj
}