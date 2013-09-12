Typium.Mapper = (function() {
	var mapper = { };

	// List supported mapping methods
	mapper.METHOD_NAIVE = "naive";
	
	// Internal variables
	var method = mapper.METHOD_NAIVE;
	
	// Public static functions
	
	// Initializes the mapper
	// - target: list of HTML elements
	mapper.init = function(targets) {  
	};
	
	// Maps gaze point to the targets
	// - x, y: gaze point (client coordinates)
	mapper.map = function(x, y) {
		var mapNaive = function() {
		};
		
		var result = null;
		if (method === Typium.MAPPING_NAIVE) {
			result = mapNaive();
		}
		
		return result;
	};
	
	return mapper;
})();