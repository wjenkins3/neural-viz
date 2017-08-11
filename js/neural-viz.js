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
        init();
    }); 
     
    var architecture_data = [ 
        {name: "Fully Recurrent w/ tanh"}, 
        {name: "Fully Recurrent w/ ReLU"}, 
        {name: "Gated Recurrent Unit (GRU)"}, 
        {name: "Long Short-Term Memory (LSTM)"}]; 
         
    var pick = d3.select("#sel-arch"); 
     
    var choices = pick.selectAll("option") 
        .data(architecture_data) 
        .enter() 
        .append("option") 
        .attr("value", function(d) {return d.name;}) 
        .html(function(d) {return d.name;}); 
         
    pick.on("change", function() {
        init();
    }); 
}


function set_default_config() {

    preset_configuration = { 
        hidden_size: 6, 
        learning_rate: 0.01, 
        random_state: 0 
    };     
}


function init() {
    
    get_vocab();
    svg_width = 1000;
    svg_height = 600;
    hmap_svg_height = 700;
    d3.selectAll("#viz > *").remove();
    svg = d3.select("#viz");
    svg.classed("svg-content-responsive", true)
        .classed("neural-net", true);
    tanh_scale = d3.scaleSequential()
        .domain([-1, 1])
        .interpolator(d3.interpolateRdBu);
    sigmoid_scale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRdBu);
    relu_scale = d3.scaleSequential()
        .domain([-20, 20])
        .interpolator(d3.interpolateRdBu);
    d3.selectAll("#params > *").remove();
    params_svg = d3.select("#params");
    params_svg
        .classed("svg-content-responsive", true)
        .classed("heatmap", true);
    setup_architecture();
    
    // TODO: animate context vector
}

function get_vocab() {
    
    vocab = [];
    current_input = null;
    current_input_idx = -1;
    var sequence_data = $("#sequence-data").val().trim().split(",");
    sequence_data.forEach(function(d) {
        d = d.trim();
        vocab.push(d);
    });
    vocab = $.unique(vocab.sort());
}

function setup_architecture() {

    input_neurons = [];
    output_neurons = [];
    prev_state_neurons = [];
    curr_state_neurons = [];
    
    vocab_size = vocab.length;
    vocab.forEach(function(d, i) {
        input_neurons.push({name: d, value: 0, idx: i});
        output_neurons.push({name: d, value: 0, idx: i});
    });

    hidden_size = preset_configuration.hidden_size;
    for (var j = 0; j < hidden_size; j++) {
        prev_state_neurons.push({value: 0, idx: j});
        curr_state_neurons.push({value: 0, idx: j});
    }
   

    var arch_selection = d3.select("#sel-arch").property("selectedIndex");
    switch (arch_selection) {
        case 0:
            activation = "tanh"; setup_vanilla(); break;
        case 1:
            activation = "relu"; setup_vanilla(); break;
        case 2:
            activation = "tanh"; setup_gru(); break;
        case 3:
            activation = "tanh"; setup_lstm(); break;
        default:
            activation = "tanh"; setup_vanilla();
    }
}

function get_random(mean, stddev) {

    var stddevs = Math.floor(Math.random() * 4) + 1;
    var min = mean - stddevs * stddev;
    var max = mean + stddevs * stddev;
    return Math.random() * (max - min) + min;
}

function setup_vanilla() {
    
    inputEdges = [];
    contextEdges = [];
    outputEdges = [];
    inputVectors = [];
    contextVectors = [];
    outputVectors = [];

    // Input to hidden state and hidden state to output
    for (var i = 0; i < vocab_size; i++) {
        var input_vector = [];
        var output_vector = [];
        for (var j = 0; j < hidden_size; j++) {
            var input_weight = {source: i, target: j, weight: get_random(0, 1.0/Math.sqrt(vocab_size+hidden_size))};
            var output_weight = {source: j, target: i, weight: get_random(0, 1.0/Math.sqrt(hidden_size))};
            inputEdges.push(input_weight);
            outputEdges.push(output_weight);
            input_vector.push(input_weight);
            output_vector.push(output_weight);
        }
        inputVectors.push(input_vector);
        outputVectors.push(output_vector);
    }

    // Previous hidden state to current hidden state    
    for (var i = 0; i < hidden_size; i++) {
        var input_vector = [];
        for (var j = 0; j < hidden_size; j++) {
            var input_weight = {source: i, target: j, weight: get_random(0, 1.0/Math.sqrt(vocab_size+hidden_size))};
            contextEdges.push(input_weight);
            input_vector.push(input_weight);
        }
        contextVectors.push(input_vector);
    }
    
    domains = d3.extent(inputEdges, function(d) { return d.weight});
    domains = domains.concat(d3.extent(outputEdges, function(d) { return d.weight}));
    domains = domains.concat(d3.extent(contextEdges, function(d) { return d.weight}));
    
    weights_scale = d3.scaleSequential()
        .domain(d3.extent(domains))
        .interpolator(d3.interpolateRdBu);   

    draw_vanilla(); 
    setup_vanilla_heatmap();   
}

function setup_gru() {
}

function setup_lstm() {
}

function draw_vanilla() {

    var inputNeuronCX = svg_width * 0.15;
    var outputNeuronCX = svg_width - inputNeuronCX;
    var stateNeuronCX = 0.5 * (outputNeuronCX - inputNeuronCX) + inputNeuronCX;
    var ioNeuronCYMin = svg_height * 0.125;
    var iNeuronCYInc = (svg_height - 2 * ioNeuronCYMin) / (hidden_size + vocab_size - 1 + 1e-6);
    var oNeuronCYInc = (svg_height - 2 * ioNeuronCYMin) / (vocab_size - 1 + 1e-6);
    var hNeuronCYInc = (svg_height - 2 * ioNeuronCYMin) / (hidden_size - 1 + 1e-6);
    var edgeNeuronRadius = svg_width * 0.015;
    var neuronLabelOffset = edgeNeuronRadius * 1.4;

    var inputNeuronElems = svg
        .selectAll("g.input-neuron")
        .data(input_neurons)
        .enter()
        .append("g")
        .classed("input-neuron", true)
        .classed("neuron", true);
    
    inputNeuronElems
        .append("circle")
        .attr("cx", inputNeuronCX)
        .attr("cy", function (d, i) { return ioNeuronCYMin + iNeuronCYInc * (i + hidden_size)});

    inputNeuronElems
        .append("text")
        .classed("neuron-label", true)
        .attr("x", inputNeuronCX - neuronLabelOffset)
        .attr("y", function (d, i) {return ioNeuronCYMin + iNeuronCYInc * (i + hidden_size)})
        .attr("text-anchor", "end");

    var contextNeuronElems = svg
        .selectAll("g.context-neuron")
        .data(prev_state_neurons)
        .enter()
        .append("g")
        .classed("input-neuron", true)
        .classed("neuron", true);

    contextNeuronElems
        .append("circle")
        .attr("cx", inputNeuronCX)
        .attr("cy", function (d, i) { return ioNeuronCYMin + iNeuronCYInc * i;});

    svg.selectAll("g.input-neuron > circle")
        .attr("r", edgeNeuronRadius)
        .attr("stroke-width", "2")
        .attr("stroke", "grey")
        .attr("fill", function(d) { return tanh_scale(0.0);});

    var stateNeuronElems = svg
        .selectAll("g.state-neuron")
        .data(curr_state_neurons)
        .enter()
        .append("g")
        .classed("state-neuron", true)
        .classed("neuron", true);

    stateNeuronElems
        .append("circle")
        .attr("cx", stateNeuronCX)
        .attr("cy", function (d, i) { return ioNeuronCYMin + hNeuronCYInc * i;});

    svg.selectAll("g.state-neuron > circle")
        .attr("r", edgeNeuronRadius)
        .attr("stroke-width", "2")
        .attr("stroke", "grey")
        .attr("fill", function (d) {return tanh_scale(0.0);});

    var outputNeuronElems = svg
        .selectAll("g.output-neuron")
        .data(output_neurons)
        .enter()
        .append("g")
        .classed("output-neuron", true)
        .classed("neuron", true);

    outputNeuronElems
        .append("circle")
        .attr("cx", outputNeuronCX)
        .attr("cy", function (d, i) { return ioNeuronCYMin + oNeuronCYInc * i;});

    outputNeuronElems
        .append("text")
        .classed("neuron-label", true)
        .attr("x", outputNeuronCX + neuronLabelOffset)
        .attr("y", function (d, i) { return ioNeuronCYMin + oNeuronCYInc * i;})
        .attr("text-anchor", "start");

    svg.selectAll("g.output-neuron > circle")
        .attr("r", edgeNeuronRadius)
        .attr("stroke-width", "2")
        .attr("stroke", "grey")
        .attr("fill", function(d) { return tanh_scale(0.0);});

    svg.selectAll(".neuron-label")
        .attr("alignment-baseline", "middle")
        .style("font-size", 24)
        .text(function(d) {return d.name;});

    svg.selectAll("g.input-edge")
        .data(inputEdges)
        .enter()
        .append("g")
        .classed("input-edge", true)
        .classed("edge", true)
        .append("line")
        .attr("x1", inputNeuronCX + edgeNeuronRadius)
        .attr("x2", stateNeuronCX - edgeNeuronRadius)
        .attr("y1", function (d) { return ioNeuronCYMin + iNeuronCYInc * (d['source'] + hidden_size)})
        .attr("y2", function (d) { return ioNeuronCYMin + hNeuronCYInc * d['target']})
        .attr("stroke", function(d) { return weights_scale(d.weight); })
        .attr("stroke-width", "1");

    svg.selectAll("g.context-edge")
        .data(contextEdges)
        .enter()
        .append("g")
        .classed("context-edge", true)
        .classed("edge", true)
        .append("line")
        .attr("x1", inputNeuronCX + edgeNeuronRadius)
        .attr("x2", stateNeuronCX - edgeNeuronRadius)
        .attr("y1", function (d) { return ioNeuronCYMin + iNeuronCYInc * d['source']})
        .attr("y2", function (d) { return ioNeuronCYMin + hNeuronCYInc * d['target']})
        .attr("stroke", function(d) { return weights_scale(d.weight); })
        .attr("stroke-width", "1");

    svg.selectAll("g.output-edge")
        .data(outputEdges)
        .enter()
        .append("g")
        .classed("output-edge", true)
        .classed("edge", true)
        .append("line")
        .attr("x1", stateNeuronCX + edgeNeuronRadius)
        .attr("x2", outputNeuronCX - edgeNeuronRadius)
        .attr("y1", function (d) { return ioNeuronCYMin + hNeuronCYInc * d['source']})
        .attr("y2", function (d) { return ioNeuronCYMin + oNeuronCYInc * d['target']})
        .attr("stroke", function(d) { return weights_scale(d.weight); })
        .attr("stroke-width", "1");
}

function update_neuron_edges() {
    svg.selectAll("g.input-edge > line")
        .attr("stroke", function(d) { return weights_scale(d.weight); });
    svg.selectAll("g.context-edge > line")
        .attr("stroke", function(d) { return weights_scale(d.weight); });
    svg.selectAll("g.output-edge > line")
        .attr("stroke", function(d) { return weights_scale(d.weight); });    
}

function setup_vanilla_heatmap() {
    var inputCellBaseX = 0.2 * svg_width;
	var ioCellBaseY = 0.1 * hmap_svg_height;
	var matrixPadding = 0.1 * svg_width;
	var matrixRightMargin = 0.2 * svg_width;
	var matrixBottomMargin = 0.2 * hmap_svg_height + ioCellBaseY;
	var matrixWidth = (svg_width - inputCellBaseX - matrixPadding - matrixRightMargin) / 2;
	var outputCellBaseX = inputCellBaseX + matrixWidth + matrixPadding;
	var matrixHeight = hmap_svg_height - ioCellBaseY - matrixBottomMargin;
	var cellWidth = matrixWidth / hidden_size;
	var cellHeight = matrixHeight / (vocab_size + hidden_size);
	var cellFillWidth = 0.95 * cellWidth;
	var cellFillHeight = 0.95 * cellHeight;
	var rowLabelOffset = 0.03 * svg_width;
	var inputHeaderCX = inputCellBaseX + matrixWidth / 2;
	var stateHeaderCX = svg_width - matrixRightMargin - matrixWidth/2;
	var outputHeaderCX = svg_width - matrixRightMargin - matrixWidth/2;
	var ioHeaderBaseY = ioCellBaseY - 0.03 * hmap_svg_height;

	var inputWeightElems = params_svg
		.selectAll("g.hmap-input-cell")
		.data(inputEdges)
		.enter()
		.append("g")
		.classed("hmap-input-cell", true)
		.classed("hmap-cell", true)
		.append("rect")
		.attr("x", function (d) {return inputCellBaseX + cellWidth * d['target']})
		.attr("y", function (d) {return ioCellBaseY + cellHeight * d['source']})
		.attr("width", cellFillWidth)
		.attr("height", cellFillHeight);

	var outputWeightElems = params_svg
		.selectAll("g.hmap-output-cell")
		.data(outputEdges)
		.enter()
		.append("g")
		.classed("hmap-output-cell", true)
		.classed("hmap-cell", true)
		.append("rect")
		.attr("x", function (d) {return outputCellBaseX + cellWidth * d['source']})
		.attr("y", function (d) {return ioCellBaseY + cellHeight * d['target']})
		.attr("width", cellFillWidth)
		.attr("height", cellFillHeight);
		
	var contextWeightElems = params_svg
		.selectAll("g.hmap-state-cell")
		.data(contextEdges)
		.enter()
		.append("g")
		.classed("hmap-state-cell", true)
		.classed("hmap-cell", true)
		.append("rect")
		.attr("x", function (d) {return inputCellBaseX + cellWidth * d['source']})
		.attr("y", function (d) {return ioCellBaseY + cellHeight * (d['target'] + vocab_size)})
		.attr("width", cellFillWidth)
		.attr("height", cellFillHeight);

	params_svg
		.selectAll("g.hmap-cell > rect")
		.style("fill", function(d) {return weights_scale(d['weight'])});

	params_svg
		.selectAll("text.hmap-vocab-label")
		.data(input_neurons)
		.enter()
		.append("text")
		.classed("hmap-vocab-label", true)
		.text(function(d) {return d.name})
		.attr("x", inputCellBaseX - rowLabelOffset)
		.attr("y", function (d, i) {return ioCellBaseY + cellHeight * i + 0.5 * cellHeight})
		.attr("text-anchor", "end")
		.attr("alignment-baseline", "middle")
		.style("font-size", 30);

	var heatmap_labels = [
		{text: "Input to Hidden", x: inputHeaderCX, y: ioHeaderBaseY},
		{text: "Hidden to Hidden", x: inputHeaderCX, y: 0.78 * hmap_svg_height},
		{text: "Hidden to Output", x: outputHeaderCX, y: ioHeaderBaseY},
	];
	
	params_svg
		.selectAll("text.hmap-matrix-label")
		.data(heatmap_labels)
		.enter()
		.append("text")
		.classed("hmap-matrix-label", true)
		.attr("x", function(d){return d['x']})
		.attr("y", function(d){return d['y']})
		.text(function(d){return d['text']})
		.style("font-size", 28)
		.style("fill", "grey")
		.attr("text-anchor", "middle")
		.attr("alignment-baseline", "ideographic");
}