var Typium = {};

Typium.PORT_NAME = "Typium";

Typium.GET_STATE = "getState";
Typium.SHOW_OPTIONS = "showOptions";
Typium.CALIBRATE = "calibrate";
Typium.TOGGLE = "toggle";
Typium.GET_OPTIONS = "getOptions";
Typium.UPDATE_OPTIONS = "updateOptions";

Typium.options = {
	// background
	etudSamplingRate: 30,
	fixdetMaxFixSize: 50,
	fixdetBufferSize: 10,
	
	// content
	gazePointerShow: false,
	gazePointerSize: 20,
	gazePointerColor: "#000000",
	gazePointerColorA: 0.4,

	selectionDwellTime: 800,
	selectionPageFreeDwellTime: 1200,
	selectionPageDwellTime: 800,

	keyboardHeight: 240,
	keyboardOpacity: 0.8,
	keyboardColor: "#001A80",
    //keyboardLayout: '"q,w,e,r,t,y,u,i,o,p"',
	keyboardLayout: "[\"!|!|1,?|?|2,:|:|3,;|;|4,\\u0027|\\u0027|5,\\u0022|\\u0022|6,&|&|7,@|@|8,(|(|9,)|)|0\",{\"titles\":[\"backspace.png\"], \"commands\":[\"backspace\"]}],\n[\"q|Q|+,w|W|-:,e|E|*,r|R|\\/,t|T|=,y|Y|%,u|U|$,i|I|#,o|O|(,p|P|)\",{\"titles\":[\"Enter\"], \"commands\":[\"enter\"]}],\n[\"a|A|@,s|S|~,d|D|^,f|F|\\u005C,g|G|_,h|H|&,j|J|[,k|K|],l|L|\\u007B, | |\\u007D\",{\"titles\":[\"other\",\"other\",\" \"], \"commands\":[\"symbols\",\"symbols\",\" \"]}],\n[\"z|Z|,x|X|,c|C|,v|V|,b|B|,n|N|,m|M|\",{\"titles\":[\",\",\"<\",\"\"], \"commands\":[\",\",\"<\",\"\"]},\".|>|\",{\"titles\":[\"upcase\",\"lowcase\"], \"commands\":[\"upcase\",\"lowcase\"]},{\"titles\":[\"close\"], \"commands\":[\"hide\"]}]",
	
	buttonFontName: "Arial",
	buttonFontSize: 18,
	buttonFontColor: "#000000",
	buttonColor: "#A0B0F0"
};

Typium.updateControls = function(port) {
	port.postMessage({name: Typium.GET_STATE});
};

Typium.showETUDOptions = function(port) {
	port.postMessage({name: Typium.SHOW_OPTIONS});
};

Typium.calibrateETUD = function(port) {
	port.postMessage({name: Typium.CALIBRATE});
};

Typium.toggleETUD = function(port) {
	port.postMessage({name: Typium.TOGGLE});
};

Typium.parseAnswerTo_GetState_ = function(answer, output, btnOptions, btnCalibrate, btnStartStop) {
	console.log("Executed: getState = {0} ({1})".format(answer.state.code, answer.state.message));
	if(answer.state.code == 0) {
		if (output)
			output.innerHTML = chrome.i18n.getMessage("etudInstall", "<a href='http://www.sis.uta.fi/~csolsp/downloads.php?id=ETUDPlugin'>ETUD-Plugin</a>");
	} else if(answer.state.code == 1) {
		if (output)
			output.innerHTML = chrome.i18n.getMessage("etudInstall", "<a href='http://www.sis.uta.fi/~csolsp/downloads.php?id=ETUDriver'>ETU-Driver</a>");
	} else {
		if (output)
			output.innerHTML = answer.device + ": " + chrome.i18n.getMessage("etudState" + answer.state.code);
		if (btnOptions)
			btnOptions.disabled = answer.state.code == 5;
		if (btnCalibrate)
			btnCalibrate.disabled = answer.state.code != 3 && answer.state.code != 4;
		if (btnStartStop) {
			btnStartStop.disabled = answer.state.code != 4 && answer.state.code != 5;
			btnStartStop.value = chrome.i18n.getMessage(answer.state.code == 5 ? "etudStop" : "etudStart");
		}
			
		chrome.browserAction.setIcon(answer.state.code == 5 ?
					{path: {"19": "images/iconT19.png", "38": "images/iconT38.png"}} :
					{path: {"19": "images/icon19.png", "38": "images/icon38.png"}});
	}
};

// converts value to proper type
Typium.convert = function(value) {
	var result = value;
	var cv = parseFloat(value);
	if(!isNaN(cv)) {
		result = cv;
	} else if (value.toLowerCase() == "true") {
		result = true;
	} else if (value.toLowerCase() == "false") {
		result = false;
	}
	return result;
}

Typium.loadOptions = function() {
	var loadOption = function(name, value) {
		var v = localStorage.getItem(name);
		if(v == null)
			localStorage.setItem(name, value);
		else {
			if (name.toLowerCase().indexOf("color") < 0 || v.indexOf(".") >= 0 || v.length != 6)
				v = Typium.convert(v);
			Typium.options[name] = v;
		}
	};

	for (var option in Typium.options) {
		loadOption(option, Typium.options[option]);
	}
};

Typium.loadOptions();

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
