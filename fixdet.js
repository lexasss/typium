Typium.FixationDetector =
{
	currentFix: null,
	candidateFix: null,

	/*
	offset: {
		x: 0, 
		y: 0
	},
	zoom: {
		x: 1.0, 
		y: 1.0
	},*/
	
	// internal
	createSample: function(x, y)
	{
		return {x: x, y: y};
	},
	
	// params:
	//	ts: timestamp in milliseconds
	//	x: gaze x in pixels
	//	y: gaze y in pixels
	createFixation: function(ts, x, y)
	{
		return {
			ts: ts,
			x: x,
			y: y,
			duration: 0,
			saccade: {
				dx: 0, 
				dy: 0
			},
			samples: new Array()
		}
	},

	// params:
	//	ts: timestamp in milliseconds
	//	x: gaze x in pixels
	//	y: gaze y in pixels
	addSampleToFix: function(fix, ts, x, y)
	{
		while(fix.samples.length >= Typium.options.fixdetBufferSize)
			fix.samples.shift();

		fix.samples.push(this.createSample(x, y));
		fix.duration = ts - fix.ts;

		var fx = 0;
		var fy = 0;
		for(var i = 0; i < fix.samples.length; i++) {
			var sample = fix.samples[i];
			fx += sample.x;
			fy += sample.y;
		}
		fix.x = fx / fix.samples.length;
		fix.y = fy / fix.samples.length;
	},

// public
	
	// params:
	//	ts: timestamp in milliseconds
	//	x: gaze x in pixels
	//	y: gaze y in pixels
	// returns:
	//	true if a new fixation starts, false otherwise
	feed: function(ts, x, y)
	{
		//x = (x - this.offset.x) / this.zoom.x;
		//y = (y - this.offset.y) / this.zoom.y;
		var result = false;
		if(!this.currentFix) {
			this.currentFix = this.createFixation(ts, x, y);
			result = true;
		}	else if(!this.candidateFix) {
			var dx = this.currentFix.x - x;
			var dy = this.currentFix.y - y;
			var dist = Math.sqrt(dx*dx + dy*dy);
			if(dist < Typium.options.fixdetMaxFixSize) {
				this.addSampleToFix(this.currentFix, ts, x, y);
			} else {
				this.candidateFix = this.createFixation(ts, x, y);
				this.candidateFix.saccade.dx = x - this.currentFix.x;
				this.candidateFix.saccade.dy = y - this.currentFix.y;
			}
		} else {
			var dxCurr = this.currentFix.x - x;
			var dyCurr = this.currentFix.y - y;
			var distCurr = Math.sqrt(dxCurr*dxCurr + dyCurr*dyCurr);
			var dxCand = this.candidateFix.x - x;
			var dyCand = this.candidateFix.y - y;
			var distCand = Math.sqrt(dxCand*dxCand + dyCand*dyCand);
			if(distCurr < Typium.options.fixdetMaxFixSize) {
				this.addSampleToFix(this.currentFix, ts, x, y);
				this.candidateFix = null;
			} else if(distCand < Typium.options.fixdetMaxFixSize) {
				this.currentFix = this.candidateFix;
				this.candidateFix = null;
				this.addSampleToFix(this.currentFix, ts, x, y);
				result = true;
			} else {
				this.candidateFix = this.createFixation(ts, x, y);
				this.candidateFix.saccade.dx = x - this.currentFix.x;
				this.candidateFix.saccade.dy = y - this.currentFix.y;
			}
		}

		return result;
	},

	// events
	calcTransformParams: function ()
	{
		Typium.FixationDetector.zoom = {
			x: document.width / window.innerWidth,
			y: document.height / window.innerHeight
		};

		Typium.FixationDetector.offset = {
			x: window.screenX + (window.outerWidth - document.width) / 2,
			y: window.screenY + (window.outerHeight - document.height) - 
					(window.screenY > 0 ? ((window.outerWidth - document.width) / 2) : 0)
		};
		console.log("resized");
	}
};

// -----------------------------------------------------
// Now Chrome dow not fire the resize event insode of extension. 
// The functionality is moved to controller.js
// -----------------------------------------------------
//Typium.FixationDetector.calcTransformParams();
//window.addEventListener("resize", Typium.FixationDetector.calcTransformParams);
