Typium.ETUDPlugin = null;
Typium.ETUDCommPorts = [];
Typium.activeTabId = null;

// consts
Typium.ALL = "all";
Typium.OPTIONS = "options";
Typium.TABS = "tabs";
Typium.ACTIVE_TAB_AND_OPTIONS = "activeTabAndOptions";

// -----------------------------------
// Functions to assign by client

// takes these arguments:
//   timestamp: ms
//   x: gaze x
//   y: gaze y
Typium.ETUDPlugin_dataHandler = null;

// takes these arguments:
//   isStartedTracking: true is the trackign was started, false if it was stopped
Typium.ETUDPlugin_trackingTriggerHandler = null;

// -----------------------------------
// utils
Typium.ETUDPlugin_getState = function()
{
	var state = {code: 0, message: "ETUD-Pluging is not installed"};
	if(Typium.ETUDPlugin) {
		state = {code: 1, message: "ETU-Driver is not installed"};
		if(Typium.ETUDPlugin.valid) {
			state = {code: 2, message: "The device is not connected"};
			if(Typium.ETUDPlugin.Ready) {
				state = {code: 3, message: "Ready; not calibrated yet"};
				if(Typium.ETUDPlugin.Calibrated) {
					state = {code: 4, message: "Calibrated; not tracking yet"};
					if(Typium.ETUDPlugin.Tracking) {
						state = {code: 5, message: "Tracking"};
					}
				}
			}
		}
	}
	return state;
};

// -----------------------------------
Typium.sendTo = function(data, to, tabId)
{
	if (typeof(to) === "object") {
		data.isReplyToSender = true;
		to.postMessage(data);
	} else {
		var count = 0;
		for (var i = 0; i < Typium.ETUDCommPorts.length; i++) {
			var port = Typium.ETUDCommPorts[i];
			var isOptionsPage = !port.sender.tab || port.sender.tab.url.indexOf("chrome-extension") >= 0;
			data.isReplyToSender = port.sender.tab ? port.sender.tab.id === tabId : tabId === undefined;
			if (to === Typium.ALL ||
				 (to === Typium.ACTIVE_TAB_AND_OPTIONS && (isOptionsPage || port.sender.tab.id === tabId)) ||
				 (to === Typium.OPTIONS && isOptionsPage) ||
				 (to === Typium.TABS && !isOptionsPage)) {
				port.postMessage(data);
				count++;
			}
		}
	}
};

Typium.addPort = function(port) 
{
	for (var i = 0; i < Typium.ETUDCommPorts.length; i++)
		if (Typium.ETUDCommPorts[i] === port)
			return;
	Typium.ETUDCommPorts.push(port);
};

Typium.removePort = function(port) 
{
	for (var i = 0; i < Typium.ETUDCommPorts.length; i++)
		if (Typium.ETUDCommPorts[i] === port) {
			Typium.ETUDCommPorts.splice(i, 1);
			break;
		}
};

// -----------------------------------
// callbacks for buttons
Typium.ETUDPlugin_showOptions = function()
{
	if(Typium.ETUDPlugin)
		Typium.ETUDPlugin.showOptions();
};
		
Typium.ETUDPlugin_calibrate = function()
{
	if(Typium.ETUDPlugin && Typium.ETUDPlugin.Ready)
		Typium.ETUDPlugin.calibrate();
};

Typium.ETUDPlugin_startStop = function()
{
	if(Typium.ETUDPlugin && Typium.ETUDPlugin.Calibrated) {
		if(Typium.ETUDPlugin.Tracking) {
			Typium.ETUDPlugin.stop();
			window.clearInterval(Typium.dataTimer);
		} else {
			Typium.ETUDPlugin.start();
			Typium.dataTimer = window.setInterval(function() {
				Typium.sendTo({
					fixation: Typium.FixationDetector.currentFix
				}, Typium.ACTIVE_TAB_AND_OPTIONS, Typium.activeTabId);
			}, 1000 / Typium.options.etudSamplingRate);
		}
	}
};

// -----------------------------------
// state is the flag:
//   1 - stopped tracking
//   2 - started tracking
Typium.ETUDPlugin_state = function(state)
{
	console.log("Event from ETUD-Plugin: state changed to {0}".format(state));
	
	Typium.sendTo({
		state: state === 2
	}, Typium.TABS, null);
	
	if(Typium.ETUDPlugin_trackingTriggerHandler && (state === 1 || state === 2))
		Typium.ETUDPlugin_trackingTriggerHandler(state === 2);
};
		
Typium.ETUDPlugin_data = function(timestamp, x, y)
{
	Typium.FixationDetector.feed(timestamp, x, y);
	
	if(Typium.ETUDPlugin_dataHandler)
		Typium.ETUDPlugin_dataHandler(timestamp, x, y);
};

// -----------------------------------
function Typium_ETUDPlugin_loaded() 
{
	console.log("ETUD-Plugin loaded");
	
	if(Typium.ETUDPlugin !== null)
		return;

	Typium.ETUDPlugin = document.getElementById("etudPlugin");
	if(Typium.ETUDPlugin && Typium.ETUDPlugin.valid) {
		Typium.ETUDPlugin.addEventListener("state", Typium.ETUDPlugin_state, false);
		Typium.ETUDPlugin.addEventListener("data", Typium.ETUDPlugin_data, false);
	}
}

Typium.ETUDPlugin_init = function()
{
	var etudPluginContainer = document.createElement("span");
	etudPluginContainer.innerHTML = "<object id='etudPlugin' type='application/x-etudplugin' width='1' height='1'><param name='onload' value='Typium_ETUDPlugin_loaded' /></object>";
		
	document.body.insertBefore(etudPluginContainer, document.body.firstChild);
};

// -----------------------------------
chrome.runtime.onConnect.addListener(function(port) {
	console.assert(port.name === Typium.PORT_NAME);
	Typium.addPort(port);
  port.onMessage.addListener(function(request) {
			var answer = {toRequest: request.name};
			var to = null;
			if(request.name === Typium.SHOW_OPTIONS) {
				Typium.ETUDPlugin_showOptions();
				to = Typium.OPTIONS;
			} else if(request.name === Typium.CALIBRATE) {
				Typium.ETUDPlugin_calibrate();
				to = Typium.OPTIONS;
			} else if(request.name === Typium.TOGGLE) {
				Typium.ETUDPlugin_startStop();
				to = Typium.OPTIONS;
			} else if(request.name === Typium.GET_STATE) {
				answer.state = Typium.ETUDPlugin_getState();
				answer.device = answer.state.code > 1 ? Typium.ETUDPlugin.Device : "";
				to = (!port.sender.tab || port.sender.tab.url.indexOf("chrome-extension") >= 0) ? Typium.OPTIONS : port;
			} else if(request.name === Typium.GET_OPTIONS) {
				answer.options = Typium.options;
				to = port;
			} else if(request.name === Typium.UPDATE_OPTIONS) {
				Typium.loadOptions();
				to = Typium.TABS;
			}
			
			if (to)
				Typium.sendTo(answer, to, port.sender.tab ? port.sender.tab.id : undefined);
  });
	port.onDisconnect.addListener(function(request) {
		Typium.removePort(port);
	});
});

chrome.tabs.onActivated.addListener(function(info) {
	console.log("activated: " + info.tabId);
	Typium.activeTabId = info.tabId;
});

document.addEventListener('DOMContentLoaded', function () {
	Typium.ETUDPlugin_init();
});
