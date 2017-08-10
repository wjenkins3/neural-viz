$(document).ready(function() {
    set_default_data();
    set_default_config();
    init();
});

function set_default_data() {

    var preset_data =
        [{name:"4 Letter Sequence", data:"A,B,B,A,C,D,A,C,D,A,B,C,D,A,B,B,B,C,D,A"},
         {name:"DNA Sequence", data:"A,C,A,A,G,A,T,G,C,C,A,T,T,G,T,C,C,C,C,C,G,G,C,C,T"},
         {name:"Musical Sequence", data:"E,E,G,E,E,G,E,G,C,B,A,A,G,D,E,F,D,D,E,F,D,F,B,A,G,B,C"}];
         
    $('#sequence-data').html(preset_data[0].data);
    
    var select = d3.select("#sel-presets");
    
    var options = select.selectAll("option")
        .data(preset_data)
        .enter()
        .append("option")
        .attr("value", function(d) {return d.name;})
        .html(function(d) {return d.name;});
    
    select.on("change", function() {
        var selectedIndex = select.property("selectedIndex");
        var selectedPreset = options.filter(function(d, i) { return i == selectedIndex;});
        $("#sequence-data").html(selectedPreset.datum().data);
    });
    
    var architecture_data = [
        {name: "Gated Recurrent Unit (GRU)"},
        {name: "Long Short-Term Memory (LSTM)"},
        {name: "Fully Recurrent w/ tanh"},
        {name: "Fully Recurrent w/ ReLU"}];
        
    var pick = d3.select("#sel-arch");
    
    var choices = pick.selectAll("option")
        .data(architecture_data)
        .enter()
        .append("option")
        .attr("value", function(d) {return d.name;})
        .html(function(d) {return d.name;});
        
    pick.on("change", function() {;});
}

function set_default_config() {

    var preset_configuration = {
        hidden_size: 6,
        learning_rate: 0.01,
        random_state: 0
    };    
}

function init() {
}