/* call this function when the Live Reports page menu item is clickd 
see in teh home.json the key "menu_load_function"
parameters:
menu_item_key - key of the menu item (expected value "live_reports")
menu_item_data - menu item related data (content of the live_reports.json is expected), 
callback_when_done - callback function, that could be called (if it's needed) when performing thi function is done

return value - empty string if all is ok or an error message
*/

function load_live_reports(menu_item_key, menu_item_data, callback_when_done){
    if (ToggledCurrencies.length() == 0){
        return "Any toggled currency was found! Please, toggle some currency!"
    }
    initiateLiveReportsPage();
    whenChartIsReady().then(()=>{
        $('#'+menu_item_data.chart_container_id).html(menu_item_data.chart_template);        
        LiveReportsChart.initiateChart(menu_item_data);
        permit_price_updating = true;
        LiveReportsChart.updatePrices(false);
        LiveReportsChart.startPriceUpdating();
        //
        callback_when_done();
    }).catch(error=>{
        return `Error: ${error}\nWe can't load a page!\nPlease, check your connection to Internet\nand then try to refresh this page!`;
    })   
    return "";
}

/* refresh/provide the initial state of the Live Reports page 
see in teh about.json the key "refresh_function"
parameters:
menu_item_data - menu item related data (content of the live_reports.json is expected), 

return value - empty string if all is ok or an error message
*/
async function initiateLiveReportsPage(menu_item_data){
    hideSearch();
}

/* Prepare a chart object
return value - a Promise that check with 2 sec interval if the Google chart is loaded from source. If ready then call resolve-function.
*/
async function whenChartIsReady(max_waiting_time){
    let waiting_time = max_waiting_time
    if (!waiting_time) waiting_time = 30000;
    return new Promise(async (resolve, reject) =>{
        let waiting_interval = 2000;
        while(!LiveReportsChart.isReady()){
            await sleep(waiting_interval);
            waiting_time -= waiting_interval;
            if (waiting_time <= 0){
                reject(`Waiting timeout ${max_waiting_time} is exceeded!`);
            }
        }
        resolve();
    });
}

/* Class of the Google chart 
All properies and methods are static so could be used without calling "new" operator */
class LiveReportsChart{
    /*below different properties of the class that we need on different steps of chart's life-cycle */
    static chart_is_loaded = false;
    static data;
    static chart;
    static html_sign;
    static options = {};
    static currency_symbols = [];
    static api_url = "";
    static to_currency_symbol= "";
    static wait_sign_src;
    static updating_sign_src;
    static error_sign_src;
    static multiplier = 1;
    static parent_container_id;
    static updating_interval = 2000;


    /* we use this method as a callback function on loading Google-charts */
    static chartIsLoaded(){
        LiveReportsChart.chart_is_loaded = true;
    }
    /* creation and configuring the chart */
    static initiateChart(menu_item_data){
        LiveReportsChart.parent_container_id = menu_item_data.parent_container_id;
        LiveReportsChart.html_sign = document.getElementById(menu_item_data.updating_signs.id);
        LiveReportsChart.wait_sign_src = menu_item_data.updating_signs.wait_img;
        LiveReportsChart.updating_sign_src = menu_item_data.updating_signs.updating_img;
        LiveReportsChart.error_sign_src = menu_item_data.updating_signs.error_img;

        LiveReportsChart.data = new google.visualization.DataTable();
        LiveReportsChart.chart = new google.charts.Line(document.getElementById(menu_item_data.chart_id));

        LiveReportsChart.currency_symbols = [];
        LiveReportsChart.to_currency_symbol = menu_item_data.to_currency_symbol.toUpperCase();       
        LiveReportsChart.multiplier = menu_item_data.chart_options.multiplier;
        LiveReportsChart.updating_interval = menu_item_data.chart_options.interval;

        LiveReportsChart.data.addColumn('string', 'Time');
        ToggledCurrencies.get_list_of_toggled_currencies().forEach((currency_id, ind) => {
            let currency_obj = SiteStorage.get_item(currency_id);
            let currency_symbol = currency_obj[key_symbol].toUpperCase();
            LiveReportsChart.data.addColumn('number', currency_symbol);    
            LiveReportsChart.currency_symbols.push(currency_symbol);
        });

        let str_of_symbols = LiveReportsChart.currency_symbols.join(', ');

        LiveReportsChart.options = {
            chart: {
              title: menu_item_data.chart_options.h_title.replace('-FromSymbols-', str_of_symbols).replace('-ToSymbol-', LiveReportsChart.to_currency_symbol).replace('-Multiplier-', LiveReportsChart.multiplier.toFixed(0))
            },
            width: menu_item_data.chart_options.width,
            height: menu_item_data.chart_options.height,
            hAxis:{
                textStyle:{
                    bold:true
                }
            },
            vAxis:{
                title: menu_item_data.chart_options.v_title.replace('-FromSymbols-', str_of_symbols).replace('-ToSymbol-', LiveReportsChart.to_currency_symbol),
                textStyle:{
                    bold:true
                }
            }
        };
        LiveReportsChart.options = google.charts.Line.convertOptions(LiveReportsChart.options)
        
        LiveReportsChart.api_url = menu_item_data.api_template.replace('-ToggledCurrencies-', str_of_symbols);
    }

    /* Re-Drawing the chart  */
    static drawChart(){
        LiveReportsChart.chart.draw(LiveReportsChart.data, LiveReportsChart.options);
    }

    /* Add new price to the chart's data table */
    static addPrices(data){
        let row = [ getMinSecOfNow() ];
        LiveReportsChart.currency_symbols.forEach(currency_symbol => {
            if (data[currency_symbol]){
                if (data[currency_symbol][LiveReportsChart.to_currency_symbol]){
                    row.push(data[currency_symbol][LiveReportsChart.to_currency_symbol] * LiveReportsChart.multiplier) ;
                }else{
                    row.push(0);
                }
            }else{
                row.push(0);
            }
        });
        LiveReportsChart.data.addRows([row]);
        
    }

    /* Start periodical updating price data in the chart 
    We use Promise to perform this work asynchrony 
    The Promise create timeouter that call the updating price method
    */
    static startPriceUpdating(){
        return new Promise((resolve)=>{
            setTimeout(LiveReportsChart.updatePrices, LiveReportsChart.updating_interval, true);
            resolve();
        })        
    }

    /* Updating price data in teh chart 
    parameters:
    repeatedly - boolean sign instructing the method whether it should be performed one time or repeatedly
    */
    static updatePrices(repeatedly){
        LiveReportsChart.html_sign.src = LiveReportsChart.updating_sign_src;
        //if the global variable permiting price updating is true
        if (permit_price_updating){            
            fetch(LiveReportsChart.api_url).then(response=>{
                return response.json();
            }).then(data=>{
                LiveReportsChart.addPrices(data);
                LiveReportsChart.drawChart();
                if (repeatedly){
                    //if repeatedly, then start next intereation of price updating
                    LiveReportsChart.startPriceUpdating();
                } 
                LiveReportsChart.html_sign.src = LiveReportsChart.wait_sign_src;
            }).catch(error=>{
                LiveReportsChart.html_sign.src = LiveReportsChart.updating_sign_src;
                showError('ERROR!', error, reloadSite);
            });
        }else{
            /*if the global variable permiting price updating is false
            then it means that user has changed menu page
            we remove all the Live Reports container from the site's HTML
            */
            removeMenuContainer(LiveReportsChart.parent_container_id);
        }
    }

    static isReady(){
        return LiveReportsChart.chart_is_loaded;
    }
}

/* the following code is taken from the google documentation:
see: https://developers-dot-devsite-v2-prod.appspot.com/chart/interactive/docs/basic_load_libs
 */
google.charts.load('current', {'packages':['line']});
google.charts.setOnLoadCallback(LiveReportsChart.chartIsLoaded);