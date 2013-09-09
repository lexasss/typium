Typium.Controller =
{
	commPort: null,
	gazePoint: null,
	pointer: null,
	keyboard: null,
	selector: null,
	inputs: [],
	links: [],
	currentAttention: null,
	
	offset: {
		x: 0,
		y: 0
	},
	zoom: {
		x: 1.0,
		y: 1.0
	},

	// constants
	updateInterval: 40,

	// operational vars
	running: 0,

	//----------------------------------------------------------------------------------
	// utils
	constructListOfTargets: function() {
		var result = [];
		if (this.selector.isVisible()) {
			this.selector.forEachButton(function(btn) {
				result.push(btn.dom);
			});
		} else if (this.keyboard.isVisible()) {
			this.keyboard.forEachButton(function(btn) {
				result.push(btn.dom);
			});
		} else {
			this.inputs.each(function(obj) {
				result.push(obj);
			});
			this.links.each(function(obj) {
				result.push(obj);
			});
		}
		return result;
	},
	
	obtainInputs: function()
	{
		var id = 0;
		this.inputs = $("*").filter(function(index) {
			var result = false;
			try {
				result = typeof this.selectionStart == "number";
				if (result) {
					this.attention = {
						duration: 0,
						//animation: null,
						freezed: false}; //not really needed
					if (!this.id) {
						this.id = "typiumInput_" + (id++);
					}
				}
			} catch (e) { }
			return result;
		});
	},
	
	obtainLinks: function()
	{
		var id = 0;
		var that = this;
		this.links = $("*").filter(function(index) {
			var result = false;
			try {
				if (typeof this.selectionStart == "number" ||
						this.id.indexOf("typium") == 0 ||
						this.className.indexOf("typium") == 0) {
					// skip it
				} else if (this.tagName.toLowerCase() == "a") {
					result = typeof this.href == "string";
				} else {
					result = this.onclick || that.hasListeners(this, "click");
				}
				
				if (result) {
					this.attention = {
						duration: 0,
						animation: null,
						freezed: false};
					if (!this.id) {
						this.id = "typiumClickable_" + (id++);
					}
				}
			} catch (e) { }
			return result;
		});
	},
	
	hasListeners: function(element, type) {
		var listeners = element.getAttribute("eventListenters");
		return (listeners && listeners.indexOf(type) >= 0);
	},
	
	select: function(keyboard, button)
	{
		keyboard.click(button);
	},
	
	scrollToViewable: function(obj)
	{
		var objTop = $(obj).offset().top - window.scrollY;
		var objBottom = objTop + obj.clientHeight;
		var kbdTop = document.documentElement.clientHeight - Typium.options.keyboardHeight;
		var top = document.documentElement.clientHeight - Typium.options.keyboardHeight;
		if (objBottom > kbdTop) {
			if ((document.documentElement.scrollHeight - objTop) > (objBottom - kbdTop)) {
				window.scrollBy(0, kbdTop - objBottom - 12);
			} else if ($(obj).offset().top > Typium.options.keyboardHeight ) {
				top = 0;
				var diff = Typium.options.keyboardHeight + 12 - objTop;
				if (diff > 0)
					window.scrollBy(0, diff);
			}
		}
		this.keyboard.container.style.top = top + "px";
	},

	rectangleSelect: function (selector, x1, y1, x2, y2) {
		var elements = [];
		jQuery(selector).each(function() {
			var $this = jQuery(this);
			var offset = $this.offset();
			var x = offset.left;
			var y = offset.top;
			var w = $this.width();
			var h = $this.height();

			if (x >= x1 &&
					y >= y1 &&
					x + w <= x2 &&
					y + h <= y2 &&
					this.style.display != "none" &&
					this.style.visibility != "hidden") {
				elements.push($this.get(0));
			}
		});
		return elements;
	},
	
	toSafeJSONString: function(text)
	{
		return text.replace(/[\u0001-\u002F|\u003A-\u0040|\u005B-\u0060|\u007B-\u00BF]+/g, "_");
	},

	//----------------------------------------------------------------------------------
	// mapping
	match: function()
	{
		var that = this;
		
		if (this.selector.isVisible()) {
			this.matchKey(this.selector, this.onSelectorKeySelected);
			return;
		}
		
		if (this.keyboard.isVisible()) {
			this.matchKey(this.keyboard, function(button) {
				this.select(this.keyboard, button);
				this.keyboard.reset();
			});
		}
		
		var showSelector = false;
		
		showSelector = this.matchInList(this.inputs, function(element){
			$(element).focus();
			console.log("Focused " + element.tagName + "#" + element.id);
					
			if (!that.keyboard.isVisible()) {
				$(that.keyboard.container).fadeIn();
				that.scrollToViewable(element);
			}
		}) || showSelector;
		
		showSelector = this.matchInList(this.links, function(element) {
			$(element).click();
			console.log("Clicked " + element.href);
		}) || showSelector;
		
		if (showSelector && !this.selector.isVisible() && !this.keyboard.isVisible()) {
			this.showSelector();
		}
	},
	
	matchInList: function(list, onSelectionRequest)
	{
		var result = false;
		var that = this;
		
		list.each(function(index) {
			if (that.mapGazeToElement(this, that.gazePoint)) {
				var incResult = that.increaseAttention(this, that);
				if (incResult.isDwellTimeOut) {
					this.attention.duration = 0;
					this.attention.freezed = true;
					//if (this.attention.animation)
					//	this.attention.animation.update();
					
					onSelectionRequest();
				} else {
					result = result || incResult.isFreeDwellTimeOut;
				}
			} else {
				that.decreaseAttention(this, that);
			}
		});
		
		return result;
	},
	
	matchKey: function(keyboard, onSelected)
	{
		var result = false;
		var that = this;
		keyboard.forEachButton(function(button){
			var att = button.attention;
			var $btn = $(button.dom);
			var pos, size, rect;
			
			if (window.getComputedStyle(keyboard.container).getPropertyValue("position") == "absolute") {
				pos = $btn.offset();
				size = {width: $btn.outerWidth(true), height: $btn.outerHeight(true)};
				rect = {left: pos.left - window.scrollX, top: pos.top - window.scrollY,
						right: pos.left - window.scrollX + size.width, bottom: pos.top - window.scrollY + size.height};
			} else {
				pos = $btn.position();
				size = {width: $btn.outerWidth(true), height: $btn.outerHeight(true)};
				rect = {left: pos.left, top: pos.top + keyboard.container.offsetTop,
						right: pos.left + size.width, bottom: pos.top + size.height + keyboard.container.offsetTop};
			}
			if (that.gazePoint.x > rect.left && that.gazePoint.x < rect.right &&
					that.gazePoint.y > rect.top && that.gazePoint.y < rect.bottom) {
				if (!button.isPressed) {
					button.attention += that.updateInterval;
					button.update();
					if (att < Typium.options.selectionDwellTime && button.attention >= Typium.options.selectionDwellTime) {
						onSelected.call(that, button);
						result = true;
					}
				}
			} else {
				button.attention = Math.max(0, button.attention - that.updateInterval);
				button.update();
			}
		});
		return result;
	},

	mapGazeToElement: function(element, gazePoint)
	{
		var result = false;
		var compStyle = window.getComputedStyle(element);
		var elemDisplay = compStyle.getPropertyValue("display");
		var elemVisibility = compStyle.getPropertyValue("visibility");
		var elemOpacity = parseFloat(compStyle.getPropertyValue("opacity"));
		if (elemDisplay == "none" || elemVisibility == "hidden" || elemOpacity < 0.1) {
			return result;
		}
			
		var $el = $(element);
		var pos = $el.offset();
		var size = {
			width: $el.outerWidth(true),
			height: $el.outerHeight(true)
		};
		var minSize = 160;
		var extendBy = {
			x: size.width < minSize ? (minSize - size.width) / 2 : 0,
			y: size.height < minSize ? (minSize - size.height) / 2 : 0
		};
		var rect = {
			left: pos.left - window.scrollX - extendBy.x,
			top: pos.top - window.scrollY - extendBy.y,
			right: pos.left - window.scrollX + size.width + extendBy.x,
			bottom: pos.top - window.scrollY + size.height + extendBy.y
		};
				
		result = gazePoint.x > rect.left && gazePoint.x < rect.right &&
				 gazePoint.y > rect.top && gazePoint.y < rect.bottom;
		
		return result;
	},
	
	increaseAttention: function(element, controller)
	{
		var dt = Typium.options.selectionPageFreeDwellTime + Typium.options.selectionPageDwellTime;
		var att = element.attention.duration;
		var isFreeDwellTimeOut = false;
		
		if (!element.attention.freezed) {
			element.attention.duration = Math.min(dt,
					element.attention.duration + controller.updateInterval);

			if (element.attention.duration >= Typium.options.selectionPageFreeDwellTime) {
				isFreeDwellTimeOut = true;
				/*
				if (!element.attention.animation && !controller.currentAttention) {
					element.attention.animation = controller.createAttentionAnimation(element, controller);
					$("body").append(element.attention.animation);
					$(element.attention.animation).fadeIn(300);
					$(element).addClass("typiumFocusedElement");
					controller.currentAttention = element.attention.animation;
				} else if (element.attention.animation) {
					element.attention.animation.update(element.attention.duration - Typium.options.selectionPageFreeDwellTime);
				}*/
			}
		}
			
		return {
			isFreeDwellTimeOut: isFreeDwellTimeOut,
			isDwellTimeOut: att < dt && element.attention.duration >= dt
		};
	},
	
	decreaseAttention: function(element, controller)
	{
		element.attention.duration = Math.max(0, element.attention.duration - controller.updateInterval);
		/*
		if (element.attention.animation) {
			if (element.attention.duration < Typium.options.selectionPageFreeDwellTime) {
				$(element).removeClass("typiumFocusedElement");
				$(element.attention.animation).fadeOut(300, function() {
					$(this).remove();
				});
				element.attention.animation = null;
				element.attention.freezed = false;
				controller.currentAttention = null;
			} else {
				element.attention.animation.update(element.attention.duration - Typium.options.selectionPageFreeDwellTime);
			}
		}*/
	},
	
	/*
	createAttentionAnimation: function(element, controller)
	{
		var $element = $(element);
		var center = {
			x: controller.gazePoint.x, // $element.offset().left + $element.width() / 2,
			y: $element.offset().top + $element.height() / 2
		};
		
		var size = 80;
		var canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		canvas.className = "typiumAttentionAnimation";
		canvas.style.left = Math.max(0, center.x - size/2) + "px";
		canvas.style.top = Math.max(center.y - size/2) + "px";

		canvas.update = function() {
			var ctx = canvas.getContext('2d');

			ctx.clearRect(0, 0, size, size);
			//ctx.fillStyle = "#" + Typium.options.buttonColor;
			//ctx.fillRect(0, 0, size, size);

			var d = element.attention.duration - Typium.options.selectionPageFreeDwellTime;
			if (d > 0) {
				ctx.beginPath();
				ctx.lineWidth = Math.max(5, size/20);
				ctx.arc(size/2, size/2, 0.45*size, -0.5*Math.PI,
					-0.5*Math.PI + 2*Math.PI*(Math.min(1.0, d / Typium.options.selectionDwellTime)));
				ctx.strokeStyle = "red";
				ctx.stroke();
			}
		}
		
		return canvas;
	},*/
	
	onSelectorKeySelected: function(button) {
		if (this.selector.displayTimeout) {
			clearTimeout(this.selector.displayTimeout);
			this.selector.displayTimeout = 0;
		}
		if (button.titles[0] == "close.png") {
			this.select(this.selector, button);
		} else {
			var elem = document.getElementById(button.commands[0]);
			if (elem) {
				if (elem.href) {
					window.location = elem.href;
					console.log("Clicked " + elem.href + " #" + button.commands[0]);
				} else {
					$(elem).focus();
					$(elem).click();
							
					if (typeof this.selectionStart == "number" &&
							!this.keyboard.isVisible()) {
						$(this.keyboard.container).fadeIn();
						this.scrollToViewable(elem);
					}
							
					console.log("Focused " + button.titles[0] + "#" + button.commands[0]);
				}
			}
			$(this.selector.container).fadeOut(300);
		}

		this.removeHighlightings();
		this.keyboard.reset();
	},
			
	showSelector: function()
	{
		var layout = "";
		var count = 0;
			
		var that = this;
		var constructLayoutFrom = function(list, getTextFromItem) {
			list.each(function(index) {
				if (this.attention.duration > Typium.options.selectionPageFreeDwellTime / 2) {
					if (layout.length) {
						layout += ",";
					}
					this.attention.styleID = count % 10;
					this.classList.add("link" + this.attention.styleID);
					var text = getTextFromItem(this);
					layout += "[{\"titles\":[\"" +
						(text ? text : "_empty_") +
						"\"],\"commands\":[\"" + this.id + "\"],\"className\":\"linkButton" +
						this.attention.styleID + "\"}]";
					count++;
				}
				this.attention.duration = 0;
			});
		};
			
		constructLayoutFrom(this.inputs, function(element) {
			return that.toSafeJSONString(element.value);
		});
		constructLayoutFrom(this.links, function(element) {
			return that.toSafeJSONString(element.innerText);
		});
		
		layout += (layout.length ? "," : "") + "[{\"titles\":[\"close.png\"],\"commands\":[\"hide\"]}]";
		count++;
			
		this.selector.container.style.left = Math.min(document.documentElement.clientWidth - 200,
				Math.floor(this.gazePoint.x + 30)) + "px";
		this.selector.container.style.top = Math.min(document.documentElement.clientHeight - count * 80 - 32,
				Math.floor(this.gazePoint.y)) + "px";
		this.selector.container.style.width = "160px";
		this.selector.container.style.height = (count * 80) + "px";

		this.selector.container.style.opacity = "0.0";
		this.selector.container.style.display = "block";
		this.selector.createLayout(layout);
		this.selector.container.style.display = "none";
		this.selector.container.style.opacity = "";
		/*
		this.selector.displayTimeout = setTimeout(function() {
			that.removeHighlightings();
			$(that.selector.container).fadeOut();
		}, 3000);
			*/	
		$(this.selector.container).fadeIn(300);
	},
	
	removeHighlightings: function() {
		this.selector.forEachButton(function(button) {
			var elem = document.getElementById(button.commands[0]);
			if (elem && typeof elem.attention.styleID !== "undefined") {
				elem.classList.remove("link" + elem.attention.styleID);
			}
		});
	},

	updatePointer: function()
	{
		this.pointer.style.width = Typium.options.gazePointerSize + "px";
		this.pointer.style.height = Typium.options.gazePointerSize + "px";
		this.pointer.style.borderRadius = (Typium.options.gazePointerSize / 2).toFixed(0) + "px";
		this.pointer.style.backgroundColor = "#" + Typium.options.gazePointerColor;
		this.pointer.style.opacity = Typium.options.gazePointerColorA;
	},

	//----------------------------------------------------------------------------------
	// responds to events
	stop: function()
	{
		clearInterval(this.running);
		this.running = 0;

		this.pointer.style.display = "none";
		this.gazePoint = null;
		
		this.keyboard.reset();
	},

	start: function()
	{
		this.obtainInputs();
		this.obtainLinks();

		this.running = setInterval(function() {
			if (!Typium.Controller.gazePoint)
				return;
			
			Typium.Controller.match();
			
			if (Typium.options.gazePointerShow) {
				Typium.Controller.pointer.style.left = (Typium.Controller.gazePoint.x - Typium.options.gazePointerSize / 2) + "px";
				Typium.Controller.pointer.style.top = (Typium.Controller.gazePoint.y - Typium.options.gazePointerSize / 2) + "px";
			}
		}, this.updateInterval);

		if (Typium.options.gazePointerShow) {
			this.updatePointer();
			this.pointer.style.display = "block";
		}
	},

	onResize: function ()
	{
		Typium.Controller.keyboard.update();
		
		// pixels / units
		Typium.Controller.zoom = {
			x: document.width / document.body.scrollWidth, //documentElement.scrollWidth,
			y: document.height / document.body.scrollHeight //documentElement.scrollHeight
		};

		var isFullScreen = document.width == screen.availWidth;
		var innerWidth = window.innerWidth * Typium.Controller.zoom.x;
		var innerHeight = window.innerHeight * Typium.Controller.zoom.y;
		Typium.Controller.offset = {
			x: window.screenX + (window.outerWidth - innerWidth) / 2,
			y: window.screenY + (window.outerHeight - innerHeight) -
					(isFullScreen ? 0 : (window.outerWidth - innerWidth) / 2)
		};
	},

	//----------------------------------------------------------------------------------
	// initialization
	loadCSS: function(file)
	{
		var head  = document.getElementsByTagName('head')[0];
		var link  = document.createElement('link');
		link.rel  = "stylesheet";
		link.type = "text/css";
		link.href = file;
		link.media = "all";
		head.appendChild(link);
	},
	
	// to be called on window load
	init: function()
	{
		//this.loadCSS(chrome.extension.getURL("keyboard.css"));
		
		this.pointer = document.createElement("div");
		this.pointer.id = "typiumPointer";
		
		this.keyboard = new Typium.Keyboard("typiumKeyboard", true);
		this.keyboard.container.style.opacity = "0.0";
		
		this.selector = new Typium.Keyboard("typiumSelector", false);
		this.selector.container.style.opacity = "0.0";
		
		document.body.appendChild(this.keyboard.container);
		document.body.appendChild(this.selector.container);
		document.body.appendChild(this.pointer);
		
		setTimeout(function() {
			Typium.Controller.keyboard.container.style.display = "none";
			Typium.Controller.keyboard.container.style.opacity = "";
			Typium.Controller.selector.container.style.display = "none";
			Typium.Controller.selector.container.style.opacity = "";
		}, 1000);

		this.commPort = chrome.runtime.connect({name: Typium.PORT_NAME});
		this.commPort.onMessage.addListener(function(answer) {
			if (answer.state !== undefined) {
				var isTracking;
				if(typeof(answer.state) == "object") {
					console.log("ETUD state: {0}".format(answer.state.message));
					isTracking = answer.state.code == 5;
				} else {
					console.log("ETUD state: {0}".format(answer.state));
					isTracking = answer.state;
				}
				
				if(isTracking) {
					if(!Typium.Controller.running)
						Typium.Controller.start();
				} else {
					if(Typium.Controller.running)
						Typium.Controller.stop();
				}
			} else if (answer.fixation !== undefined) {
				if (answer.fixation) {
					Typium.Controller.gazePoint = {
						ts: answer.fixation.ts,
						x: (answer.fixation.x - Typium.Controller.offset.x) / Typium.Controller.zoom.x,
						y: (answer.fixation.y - Typium.Controller.offset.y) / Typium.Controller.zoom.y,
						duration: answer.fixation.duration,
						saccade: {
							dx: answer.fixation.saccade.dx,
							dy: answer.fixation.saccade.dy
						}
					};
				}
			} else if (answer.options !== undefined) {
				Typium.options = answer.options;
				Typium.Controller.keyboard.update(Typium.options);
				Typium.Controller.selector.update(Typium.options);
				Typium.Controller.updatePointer();
			} else if (answer.toRequest == Typium.UPDATE_OPTIONS) {
				Typium.Controller.commPort.postMessage({name: Typium.GET_OPTIONS});
			}
		});
		this.commPort.postMessage({name: Typium.GET_OPTIONS});
		this.commPort.postMessage({name: Typium.GET_STATE});
	}
};

//----------------------------------------------------------------------------------
// run on load
var injectedJS = "\
(function(original) { \
  Element.prototype.addEventListener = function(type, listener, useCapture) { \
    var attr = this.getAttribute('eventListenters'); \
    var types = attr ? attr.split(',') : []; \
    var found = false; \
    for (var i = 0; i < types.length; ++i) { \
      if (types[i] == type) { \
        found = true; \
        break; \
      } \
    } \
    if (!found) { \
      types.push(type); \
    } \
    this.setAttribute('eventListenters', types.join(',')); \
    return original.apply(this, arguments); \
  } \
})(Element.prototype.addEventListener); \
\
(function(original) { \
  Element.prototype.removeEventListener = function(type, listener, useCapture) { \
    var attr = this.getAttribute('eventListenters'); \
    var types = attr ? attr.split(',') : []; \
    var removed = false; \
    for (var i = 0; i < types.length; ++i) { \
      if (types[i] == type) { \
        types.splice(i, 1); \
        removed = true; \
        break; \
      } \
    } \
    if (removed) { \
      this.setAttribute('eventListenters', types.join(',')); \
    } \
    return original.apply(this, arguments); \
  } \
})(Element.prototype.removeEventListener); \
";

var script = document.createElement("script");
script.type = "text/javascript";
script.appendChild(document.createTextNode(injectedJS));
document.documentElement.appendChild(script);

window.addEventListener("load", function() {
	Typium.Controller.init();
	Typium.Controller.onResize();
	window.addEventListener("resize", Typium.Controller.onResize);
});