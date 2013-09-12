Typium.etudCommPortForOptions = null;

Typium.saveOptions = function()
{
	var set = function(name) {
		var el = document.getElementById(name);
		if (el === undefined) {
			console.log("Save options: missing the element {0}".format(name));
			return;
		}
		var v;
		if (el.type === "checkbox")
			v = el.checked;
		else if (name.toLowerCase().indexOf("color") >= 0 && el.value.indexOf(".") < 0 && el.value.length === 6)
			v = el.value;
		else
			v = Typium.convert(el.value);
		localStorage.setItem(name, v);
	};

	for (var option in Typium.options)
		set(option);

	Typium.etudCommPortForOptions.postMessage({name: Typium.UPDATE_OPTIONS});
		
	var saveConfirmation = $("#saveConfirmation");
	saveConfirmation.html(chrome.i18n.getMessage("optionsSaved"));
	setTimeout(function() {
		saveConfirmation.html("");
	}, 1500);
};

Typium.loadOptions = function()
{
	var get = function(name) {
		var v = localStorage.getItem(name);
		if (v !== null) {
			var el = document.getElementById(name);
			if (el === undefined)
				return;
			if (el.type === "checkbox")
				el.checked = v === "true";
			else
				el.value = v;
		} else {
			console.log("Load: missing the setting {0}".format(name));
		}
	};

	for (var option in Typium.options)
		get(option);
};

document.addEventListener("DOMContentLoaded", function() {
	Typium.loadOptions();
	
	document.title = chrome.i18n.getMessage("name");
	
	$("#save").click(Typium.saveOptions);
	$("#etudOptions").click(function() {Typium.showETUDOptions(Typium.etudCommPortForOptions);});
	$("#etudCalibrate").click(function() {Typium.calibrateETUD(Typium.etudCommPortForOptions);});
	$("#etudStartStop").click(function() {Typium.toggleETUD(Typium.etudCommPortForOptions);});
	
	$("#save").val(chrome.i18n.getMessage("save"));
	$("#etudOptions").val(chrome.i18n.getMessage("etudOptions"));
	$("#etudCalibrate").val(chrome.i18n.getMessage("etudCalibrate"));
	$("#etudStartStop").val(chrome.i18n.getMessage("etudStart"));
	
	$("#title").html(chrome.i18n.getMessage("optionsTitle", chrome.i18n.getMessage("name")));
	$("#etudDeviceName").html(chrome.i18n.getMessage("etudLoading"));

	$("label").html(function() {
		var id = $(this.parentNode).find(":input")[0].id;
		if (id) {
			this.htmlFor = id;
			return chrome.i18n.getMessage(id);
		}
		return "";
	});
	
	$("td:first-child").filter(function() {
		var input = $(this).next().children("input[type='number'],input[type='text'],input.color,textarea")[0];
		if (input) {
			this.innerHTML = chrome.i18n.getMessage(input.id);
		}
		return input !== undefined;
	});

	$("h3,span").html(function() {
		return chrome.i18n.getMessage(this.id);
	});

	Typium.etudCommPortForOptions = chrome.runtime.connect({name: Typium.PORT_NAME});
	Typium.etudCommPortForOptions.onMessage.addListener(function(answer) {
		if (answer.toRequest === Typium.GET_STATE) {
			Typium.parseAnswerTo_GetState_(answer, 
				document.getElementById("etudDeviceName"),
				document.getElementById("etudOptions"),
				document.getElementById("etudCalibrate"),
				document.getElementById("etudStartStop")
			);
			if (answer.state.code === 4) {
				$("#etudLiveData").html("");
			}
		} else if (answer.toRequest !== undefined) {
			console.log("Executed: {0}".format(answer.toRequest));
			if (answer.isReplyToSender)
				Typium.updateControls(Typium.etudCommPortForOptions);
		} else if (answer.fixation !== undefined) {
			if (answer.fixation) {
				$("#etudLiveData").html("Timestamp: {0}<br>X: {1}<br>Y: {2}<br>Duration: {3}".format(
					answer.fixation.ts, answer.fixation.x.toFixed(0), answer.fixation.y.toFixed(0), 
					answer.fixation.duration));
			}
		}
	});

	$("#keyboardLayoutDescriptionLink").click(function(){
		var block = $("#" + this.id.slice(0,-4))[0];
		if (block) {
			block.style.display = block.style.display !== "inline" ? "inline" : "none";
		}
	});
	
	Typium.updateControls(Typium.etudCommPortForOptions);
});
