var asia_map = null;
var chart = null;
function onReady(callback) {
    var intervalID = window.setInterval(checkReady, 1000);
    function checkReady() {
        var count = 0;
        for (var k in obj) {
            ++count;
        }

        // the number of indicators is 19,
        // so we wait until all indicators data are loaded
        if (count == 19 && asia_map != null) {
            window.clearInterval(intervalID);
            callback.call(this);
        }
    }
}

function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'js/asia.geojson', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

window.onload = function() {
    var data_dir = "data";
    load_file("data");  // call function to load data
    loadJSON(function(response) {
        asia_map = JSON.parse(response);
    });
};

function appendIndicatorOptions() {
    for (var key in obj) {
        $("#indicator_selector").append($('<option>', {
            value: key,
            text: indicator_code_to_name_map[key]
        }));
    }
}

function appendYearPerIndicator(indicator_code) {
    var new_obj = obj[indicator_code];
    $("#year_selector").html('');

    for (var i = 0; i < new_obj.length; ++i) {
        $("#year_selector").append($('<option>', {
            value: new_obj[i]['year'],
            text: new_obj[i]['year']
        }));
    }
}

function appendCountries(id_select) {
    for (var country_code in country_code_to_name_map) {
        $(id_select).append($('<option>', {
            value: country_code,
            text: toTitleCase(country_code_to_name_map[country_code])
        }));
    }
}

var updateMap = function(indicator_code, year) {

    map = anychart.map();
    map.geoData(asia_map);
    map.interactivity().selectionMode(true);
    map.padding(0);

    map.title().enabled(true).padding([10, 0, 10, 0]).useHtml(true).text(
            indicator_code_to_name_map[indicator_code] + 
            ' (Year: ' + year + ')<br/>\
            <p style="color:#929292; font-size: 12px; display: inline-block">\
              (Data source: World Bank, 2015)\
            </p>'
            );
    var ds = get_data_indicator_year(indicator_code, year);
    var max = get_max_indicator(indicator_code);
    var min = get_min_indicator(indicator_code);
    var dataSet = anychart.data.set(ds);
    var series = map.choropleth(dataSet);

    range = (max - min) / 7;
    var scaleArr = [
    {from: min, to: Math.round(range)}
    ];

    for (i=1;i<7;i++) {
        scaleObj = {};
        scaleObj.from = Math.round(i * range) + min;
        scaleObj.to = Math.round((i + 1) * range) + min;
        scaleArr.push(scaleObj);
    }
    var scale = anychart.scales.ordinalColor(scaleArr);
    scale.colors(['#4fc3f7', '#29b6f6', '#039be5', '#0288d1', '#0277bd', '#01579b', '#014377']);


    series.hoverFill(anychart.color.darken("#ff0000", 0.5));
    series.hoverStroke('white');
    series.labels().enabled(false);
    series.tooltip().textWrap('byLetter').useHtml(true);
    series.stroke('white');

    var colorRange = map.colorRange();
    colorRange.enabled(true).padding([0, 0, 20, 0]);
    colorRange.ticks().stroke('3 #ffffff').position('center').length(7).enabled(true);
    colorRange.colorLineSize(5);
    colorRange.marker().size(7);
    colorRange.labels().fontSize(11).padding(3, 0, 0, 0).format(function () {
        var range = this.colorRange;
        var name;
        if (isFinite(range.start + range.end)) {
            name = range.start + ' - ' + range.end;
        } else if (isFinite(range.start)) {
            name = 'More than ' + range.start;
        } else {
            name = 'Less than ' + range.end;
        }
        return name;
    });

    series.colorScale(scale);

    map.listen('pointClick', function(e) {
        var country_code = e.iterator.get("id");
        var indicator_code = $("#indicator_selector").val();
        load_line_chart(indicator_code, country_code);
    });

    $("#title-trend").html('Trend of ' + indicator_code_to_name_map[indicator_code]);

    var zoomController = anychart.ui.zoom();
    zoomController.render(map);

    $("#container").html('');
    map.container('container');
    map.draw();
}

var load_line_chart = function(indicator_code, country) {
    var data = get_data_trend_indicator(indicator_code, country);

    // create a chart
    chart = anychart.line();

    // create a line series and set the data
    var series = chart.line(data);
    series.name(toTitleCase(country_code_to_name_map[country]));
    chart.title(toTitleCase(country_code_to_name_map[country]));
    chart.legend(true);

    // set the container id
    $("#container-line-chart").html('');
    chart.container("container-line-chart");

    // initiate drawing the chart
    chart.draw();
}

onReady(function() {

    // initializations
    appendIndicatorOptions();

    var init_selected_indicator = $('#indicator_selector').val();
    appendYearPerIndicator(init_selected_indicator);

    var init_selected_year = $('#year_selector').val();

    // The data used in this sample can be obtained from the CDN
    // http://cdn.anychart.com/samples-data/maps-general-features/world-choropleth-map/data.js
    $("#indicator_desc").html(indicator_code_to_desc[init_selected_indicator]);
    updateMap(init_selected_indicator, init_selected_year);

    $("#indicator_selector").on('change', function() {
        console.log("Indicator changed!");
        appendYearPerIndicator(this.value);
        var init_selected_year = $('#year_selector').val();

        if (chart != null) { 
            chart.dispose();
            chart = null;

            $("#c2_selector").html('');
            $("#c3_selector").html('');
        }
        
        $("#container-line-chart").html("<p class=\"center-large\">Select a country to see its trend.</p>")

        $("#indicator_desc").html(indicator_code_to_desc[this.value]);
        updateMap(this.value, init_selected_year);
    });

    $("#year_selector").on('change', function() {
        console.log("Year changed!");
        var init_selected_indicator = $('#indicator_selector').val();

        updateMap(init_selected_indicator, this.value);
    });

    appendCountries("#c1_selector");
    $("#c1_selector").on('change', function() {
        if (chart != null) { 
            var init_selected_indicator = $('#indicator_selector').val();

            var data = get_data_trend_indicator(init_selected_indicator, this.value);
            var series_new = chart.line(data);
            series_new.name(toTitleCase(country_code_to_name_map[this.value]));

            appendCountries("#c2_selector");
        }
    });

    $("#c2_selector").on('change', function() {
        if (chart != null) { 
            var init_selected_indicator = $('#indicator_selector').val();

            var data = get_data_trend_indicator(init_selected_indicator, this.value);
            var series_new = chart.line(data);
            series_new.name(toTitleCase(country_code_to_name_map[this.value]));

            appendCountries("#c3_selector");
        }
    });

    $("#c3_selector").on('change', function() {
        if (chart != null) { 
            var init_selected_indicator = $('#indicator_selector').val();

            var data = get_data_trend_indicator(init_selected_indicator, this.value);
            var series_new = chart.line(data);
            series_new.name(toTitleCase(country_code_to_name_map[this.value]));
        }
    });
});


$(document).on('click', 'a', function(event){
    event.preventDefault();

    $('html, body').animate({
        scrollTop: $( $.attr(this, 'href') ).offset().top
    }, 500);
});