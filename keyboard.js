Typium.Keyboard = function(id, layoutFromOptions)
{
	this.o = Typium.options;
	this.layoutFromOptions = layoutFromOptions;

	//this.buttons = [];
	this.container = document.createElement('div');
	this.container.id = id;
	
	this.focused = false;
	
	this.state = 0;
	this.states = ['lowcase', 'upcase', 'other'];
	
	this.layout = [];
	
	var that = this;
	this.functions = {
		lowcase: function() {
			that.switchTo(0);
		},
		upcase: function() {
			that.switchTo(1);
		},
		other: function() {
			that.switchTo(2);
		},
		hide: function() {
			$(that.container).fadeOut();
		},
		backspace: function() {
			if (document.activeElement) {
				var caretPos = document.activeElement.selectionStart;
				var value = document.activeElement.value;
				if (caretPos !== undefined && value !== undefined && caretPos > 0) {
					var start = value.substr(0, caretPos - 1);
					var end = value.substr(caretPos);
					document.activeElement.value = start + end;
					document.activeElement.selectionStart = caretPos - 1;
					document.activeElement.selectionEnd = caretPos - 1;
				}
			}
		},
		enter: function() {
			that.simulateKeyPress(document.activeElement, 'Enter', 13);
		},
		left: function() {
			that.simulateKeyPress(document.activeElement, 'Left', 37);
		},
		right: function() {
			that.simulateKeyPress(document.activeElement, 'Left', 39);
		},
		up: function() {
			that.simulateKeyPress(document.activeElement, 'Up', 38);
		},
		down: function() {
			that.simulateKeyPress(document.activeElement, 'Down', 40);
		},
		home: function() {
			that.simulateKeyPress(document.activeElement, 'Home', 36);
		},
		end: function() {
			that.simulateKeyPress(document.activeElement, 'End', 35);
		},
		pageup: function() {
			that.simulateKeyPress(document.activeElement, 'PageUp', 33);
		},
		pagedown: function() {
			that.simulateKeyPress(document.activeElement, 'PageDown', 34);
		}
	};
};

//----------------------------------------------------------------------------------
// utils
Typium.Keyboard.prototype.is = function (type, obj) {
    var clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
};

Typium.Keyboard.prototype.lighten = function (value, rate) {
	if (value.length === undefined) {
		return Math.floor(value + (255 - value) * rate);
	} else {
		var r = this.lighten(parseInt(value.substr(0, 2), 16), rate).toString(16);
		var g = this.lighten(parseInt(value.substr(2, 2), 16), rate).toString(16);
		var b = this.lighten(parseInt(value.substr(4, 2), 16), rate).toString(16);
		return (r.length < 2 ? '0' : '') + r + (g.length < 2 ? '0' : '') + g + (b.length < 2 ? '0' : '') + b;
	}
};

Typium.Keyboard.prototype.darken = function (value, rate) {
	if (value.length === undefined) {
		return Math.floor(value * rate);
	} else {
		var r = this.darken(parseInt(value.substr(0, 2), 16), rate).toString(16);
		var g = this.darken(parseInt(value.substr(2, 2), 16), rate).toString(16);
		var b = this.darken(parseInt(value.substr(4, 2), 16), rate).toString(16);
		return (r.length < 2 ? '0' : '') + r + (g.length < 2 ? '0' : '') + g + (b.length < 2 ? '0' : '') + b;
	}
};

Typium.Keyboard.prototype.simulateKeyPress = function (target, keyName, keyCode) {
	function enter(elm) {
		if (elm.tagName.toLowerCase() === 'textarea') {
			var start = elm.value.substr(0, elm.selectionEnd);
			var end = elm.value.substr(elm.selectionEnd);
			elm.value = start + '\n' + end;
		} else {
			$(elm).keydown();
		}
	}
	
	function homeKey(elm) {
		elm.selectionEnd =
				elm.selectionStart =
						elm.value.lastIndexOf(
								'\n',
								elm.selectionEnd - 1
						) + 1;
	}

	function endKey(elm) {
		var pos = elm.selectionEnd,
				i = elm.value.indexOf('\n', pos);
		if (i === -1) i = elm.value.length;
		elm.selectionStart = elm.selectionEnd = i;
	}

	function arrowLeft(elm) {
		elm.selectionStart = elm.selectionEnd -= 1;
	}

	function arrowRight(elm) {
		elm.selectionStart = elm.selectionEnd += 1;
	}

	function arrowDown(elm) {
		var pos = elm.selectionEnd,
				prevLine = elm.value.lastIndexOf('\n', pos),
				nextLine = elm.value.indexOf('\n', pos + 1);
		if (nextLine === -1) return;
		pos = pos - prevLine;
		elm.selectionStart = elm.selectionEnd = nextLine + pos;
	}

	function arrowUp(elm) {
		var pos = elm.selectionEnd,
				prevLine = elm.value.lastIndexOf('\n', pos),
				TwoBLine = elm.value.lastIndexOf('\n', prevLine - 1);
		if (prevLine === -1) return;
		pos = pos - prevLine;
		elm.selectionStart = elm.selectionEnd = TwoBLine + pos;
	}
	
	if (!target)
		return;
	
	if (keyCode === 13)
		enter(target);
	else if (keyCode === 33)
		;//pageUp
	else if (keyCode === 34)
		;//pageDown	
	else if (keyCode == 35)
		endKey(target);
	else if (keyCode === 36)
		homeKey(target);
	else if (keyCode === 37)
		arrowLeft(target);
	else if (keyCode === 38)
		arrowUp(target);
	else if (keyCode === 39)
		arrowRight(target);
	else if (keyCode === 40)
		arrowDown(target);
}

//----------------------------------------------------------------------------------
// other
Typium.Keyboard.prototype.switchTo = function(state)
{
	this.state = state;
	//alert('Now is in '' + this.states[state] + '' state');
	
	this.forEachButton(function(button) {
		var title = this.getButtonText(button.titles, this.state);
		button.dom.style.visibility = title.length ? 'visible' : 'hidden';
		button.update();
	});
};

//----------------------------------------------------------------------------------
// creating layout
Typium.Keyboard.prototype.parseLayout = function(layout)
{
	var result = [];
	try {
    	var layoutString = '{"layout": [' + layout + '] }';
		var json = JSON.parse(layoutString);
		if (json.layout !== undefined && this.is('Array', json.layout))
			result = json.layout;
		else
			throw 'invalid';
	} catch (e) {
		alert('The definition of layout\n' + layout + '\n\nis not valid:\n' + e.message);
	}
	return result;
};

Typium.Keyboard.prototype.getButtonText = function(titles, state)
{
	var result = '';
	if(titles) {
		if (titles.length > state) {
			result = titles[state];
		} else if(titles.length > 0) {
			result = titles[0];
		}
	}
	return result;
};

Typium.Keyboard.prototype.createButtons = function(text)
{
	var letters = text.split(',');
	var buttons = [];
	for (var i = 0; i < letters.length; i++) {
		buttons.push(this.createButton(letters[i]));
	}
	return buttons;
};

Typium.Keyboard.prototype.createButton = function(data)
{
	var result = {titles: [], commands: []};
	if (this.is('String', data)) {
		var states = data.split('|');
		var i, state;
		if (states.length) {
			for (i = 0; i < states.length; i++) {
				state = states[i];
				if (!state) {
					result.titles.push('');
					result.commands.push('');
				} else {
					var v = state.split(':');
					if (!v[0] && v.length > 1) {
						result.titles.push(':');
						result.commands.push(v[1] || ':');
					} else if (v.length === 1) {
						result.titles.push(state);
						result.commands.push(state);
					} else {
						result.titles.push(v[0]);
						result.commands.push(v[1]);
					}
				}
			}
		}
	}
	
	this.validateButton(result);
	
	return result;
};

Typium.Keyboard.prototype.validateButton = function(button)
{
	button.titles = this.is('Array', button.titles) ? button.titles : [];
	button.commands = this.is('Array', button.commands) ? button.commands : [];
	button.glyphs = [null, null , null];
	button.attention = 0;
	button.isPressed = false;

	// make equal length of ttiles and commands
	var i;
	if (button.titles.length < button.commands.length) {
		for (i = button.titles.length; i < button.commands.length; i++)
			button.titles.push(button.commands[i]);
	} else if (button.commands.length < button.titles.length){
		for (i = button.commands.length; i < button.titles.length; i++)
			button.commands.push(button.titles[i]);
	}
	
	var nextTitle = '', nextCommand = '';
	if (button.titles.length) {
		nextTitle = button.titles.slice(-1)[0];
		nextCommand = button.commands.slice(-1)[0];
	}
	
	for (i = button.titles.length; i < this.states.length; i++) {
		button.titles.push(nextTitle);
		button.commands.push(nextCommand);
	}
	
	for (i = 0; i < button.commands.length; i++) {
		var p = button.commands[i].split('.');
		if (p.length > 1 && p[p.length - 1].toLowerCase() === 'png') {
			p.pop();
			button.commands[i] = p.join('.');
		}
	}
};

Typium.Keyboard.prototype.addRow = function()
{
	var row = document.createElement('div');
	row.className = 'typiumRow';
	
	this.container.appendChild(row);
	return row;
};

Typium.Keyboard.prototype.addButton = function(row, button, w, h)
{
	var text = button ? this.getButtonText(button.titles, this.state) : '';
	var btn = document.createElement('canvas');
	btn.className = 'typiumButton' + (button.className ? ' ' + button.className : '');
	if (!text.length)
		btn.style.visibility = 'hidden';
	
	var that = this;
	btn.addEventListener('mousedown', function(e) {
		that.click(button);
		e.preventDefault();
		e.stopPropagation();
	}, false);
	
	w = button && button.zoom && button.zoom !== 1 ? w*button.zoom + 12 * Math.floor(button.zoom - 0.00001) : w;
	btn.width = w;
	btn.height = h;
	//btn.style.width = w + 'px';
	//btn.style.height = h + 'px';
	btn.innerHTML = text;
	row.appendChild(btn);
	
	if (!button) {
		btn.invalid = true;
		return;
	}
	
	var keyboard = this;
	button.dom = btn;
	button.update = function() {
		var canvas = btn.getContext('2d');

		if (!button.backColor) {
			button.backColor = keyboard.calcButtonBackColor(button);
		}
		canvas.fillStyle = '#' + (button.isPressed ? keyboard.darken(button.backColor, 0.8) : button.backColor);
		canvas.fillRect(0,0,w,h);
		
		canvas.textAlign = 'center';
		canvas.textBaseline = 'middle';
		canvas.moveTo(w/2, h/2);
		canvas.font = keyboard.o.buttonFontSize + 'pt ' + keyboard.o.buttonFontName;
		canvas.fillStyle = '#' + keyboard.o.buttonFontColor;
		
		var title = keyboard.getButtonText(button.titles, keyboard.state);
		var glyph = button.glyphs[keyboard.state];
		if (glyph) {
			var dx = (w - glyph.width) / 2;
			var dy = (h - glyph.height) / 2;
			canvas.drawImage(glyph, dx, dy);
		} else {
			if (title.length > 12) {
				title = title.substr(0, 6) + ' ... ' + title.substr(title.length - 3);
			}
			canvas.fillText(title, w/2, h/2);
		}
		
		if (button.attention > 100) {
			var size = Math.min(w, h);
			canvas.beginPath();
			canvas.lineWidth = Math.max(5, size/20);
			canvas.arc(w/2, h/2, 0.45*size, -0.5*Math.PI,
				-0.5*Math.PI + 2*Math.PI*(Math.min(1.0, button.attention / keyboard.o.selectionDwellTime)));
			canvas.strokeStyle = 'red';
			canvas.stroke();
		}
	};
	
	for (i = 0; i < button.titles.length; i++) {
		var title = button.titles[i];
		var p = title.split('.');
		if (p.length > 1 && p[p.length - 1].toLowerCase() === 'png') {
			var glyph = document.createElement('img');
			glyph.src = chrome.extension.getURL('images/glyphs/' + title);
			glyph.onload = function() {
				button.update();
			};
			button.glyphs[i] = glyph;
		}
	}
};

Typium.Keyboard.prototype.createLayout = function(layout)
{
	while (this.container.hasChildNodes()) {	
		  this.container.removeChild(this.container.lastChild);
	}
	
	if (!this.is('Array', layout)) {
		layout = this.parseLayout(layout);
		this.layout = layout;
	}
	
	var r, b, row, button, buttons, a, obj, obj2;
	var rowCount = layout.length;

	for (r = 0; r < rowCount; r++) {
		row = layout[r];
		if (!this.is('Array', row)) {
			row = [row];
			layout[r] = row;
		}
		for (b = 0; b < row.length; b++) {
			obj = row[b];
			if (this.is('String', obj)) {
				buttons = this.createButtons(obj);
				row.splice.apply(row, [b, 1].concat(buttons)); // replace the string object by buttons
				b += buttons.length - 1;
			} else if (this.is('Object', obj)) {
				this.validateButton(obj);
			}
		}
	}

	var maxButtonsInRow = 0;
	for (r = 0; r < rowCount; r++) {
		maxButtonsInRow = Math.max(maxButtonsInRow, layout[r].length);
	}
	
	var btnWidth = Math.max(40, (this.container.clientWidth - 32) / Math.max(maxButtonsInRow, 1) - 13);
	var btnHeight = Math.max(40, (this.container.clientHeight - 32) / Math.max(rowCount, 1) - 13);
	for (r = 0; r < rowCount; r++) {
		row = this.addRow();
		buttons = layout[r];
		for (b = 0; b < buttons.length; b++) {
			this.addButton(row, buttons[b], btnWidth, btnHeight);
		}
		for (; b < maxButtonsInRow; b++) {
			this.addButton(row, null, btnWidth, btnHeight);
		}
	}
	
	this.reset();
};

Typium.Keyboard.prototype.calcButtonBackColor = function(button) {
	var backColor = this.o.buttonColor;
	if (button.dom.className.indexOf('linkButton') > 0) {
		backColor = window.getComputedStyle(button.dom).backgroundColor;
		var clr = /\((\d+),\s*(\d+),\s*(\d+)\)/.exec(backColor);
		if (clr.length === 4) {
			var r = parseInt(clr[1]).toString(16);
			var g = parseInt(clr[2]).toString(16);
			var b = parseInt(clr[3]).toString(16);
			var format = function(hex) { return (hex.length < 2 ? '0' : '') + hex; };
			backColor = format(r) + format(g) + format(b);
		}
	}
	return backColor;
};

//----------------------------------------------------------------------------------
// public
Typium.Keyboard.prototype.reset = function()
{
	this.forEachButton(function(button){
		button.attention = 0;
		button.update();
	});
};

Typium.Keyboard.prototype.click = function(button) {
	var command = button.commands[this.state];
	if (!command)
		return;
		
	if (command in this.functions) {
		this.functions[command]();
	} else {
		if (document.activeElement) {
			var caretPos = document.activeElement.selectionStart;
			var value = document.activeElement.value;
			if (caretPos !== undefined && value !== undefined) {
				var start = value.substr(0, caretPos);
				var end = value.substr(caretPos);
				document.activeElement.value = start + command + end;
				document.activeElement.selectionStart = caretPos + command.length;
				document.activeElement.selectionEnd = caretPos + command.length;
			}
		}
	}
	
	button.isPressed = true;
	window.setTimeout(function(btn) {
		btn.isPressed = false;
		btn.update();
	}, 300, button);
};

Typium.Keyboard.prototype.update = function(options)
{
	if (options !== undefined)
		this.o = options;
	
	this.container.style.height = (this.o.keyboardHeight - 32) + 'px';
	this.container.style.width = (document.documentElement.clientWidth - 32) + 'px';
	this.container.style.top = (document.documentElement.clientHeight - this.o.keyboardHeight) + 'px';

	//this.container.style.top = (window.innerHeight - this.o.keyboardHeight) + 'px';
	
	this.container.style.borderColor = '#' + this.o.keyboardColor;
	this.container.style.backgroundImage = '-webkit-linear-gradient(top, rgba(' +
		this.lighten(parseInt(this.o.keyboardColor.substr(0, 2), 16), 0.5) + ',' +
		this.lighten(parseInt(this.o.keyboardColor.substr(2, 2), 16), 0.5) + ',' +
		this.lighten(parseInt(this.o.keyboardColor.substr(4, 2), 16), 0.5) + ',' +
		this.o.keyboardOpacity + '), rgba(' +
		parseInt(this.o.keyboardColor.substr(0, 2), 16) + ',' +
		parseInt(this.o.keyboardColor.substr(2, 2), 16) + ',' +
		parseInt(this.o.keyboardColor.substr(4, 2), 16) + ',' +
		this.o.keyboardOpacity + ') 10px)';
	
	if (this.layoutFromOptions) {
		this.createLayout(this.o.keyboardLayout);
	}
};

Typium.Keyboard.prototype.forEachButton = function(f)
{
	var r, b, row;
	for (r = 0; r < this.layout.length; r++) {
		row = this.layout[r];
		for (b = 0; b < row.length; b++) {
			if (!row[b].invalid)
				f.call(this, row[b]);
		}
	}
};

Typium.Keyboard.prototype.isVisible = function()
{
	return this.container.style.display !== 'none';
};