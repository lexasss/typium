Typium.etudCommPortForBrowserAction = null;

document.addEventListener("DOMContentLoaded", function() {
	document.getElementById("etudOptions").addEventListener("click", function() { Typium.showETUDOptions(Typium.etudCommPortForBrowserAction); });
	document.getElementById("etudCalibrate").addEventListener("click", function() { Typium.calibrateETUD(Typium.etudCommPortForBrowserAction); });
	document.getElementById("etudStartStop").addEventListener("click", function() { Typium.toggleETUD(Typium.etudCommPortForBrowserAction); window.setTimeout(function() { window.close(); }, 200); });

	document.getElementById("etudOptions").value = chrome.i18n.getMessage("etudOptions");
	document.getElementById("etudCalibrate").value = chrome.i18n.getMessage("etudCalibrate");
	document.getElementById("etudStartStop").value = chrome.i18n.getMessage("etudStart");
	
	Typium.etudCommPortForBrowserAction = chrome.runtime.connect({name: Typium.PORT_NAME});
	Typium.etudCommPortForBrowserAction.onMessage.addListener(function(answer) {
		if (answer.toRequest == Typium.GET_STATE) {
			Typium.parseAnswerTo_GetState_(answer, 
				document.getElementById("etudDeviceName"),
				document.getElementById("etudOptions"),
				document.getElementById("etudCalibrate"),
				document.getElementById("etudStartStop")
			);
		} else if (answer.toRequest !== undefined) {
			console.log("Executed: {0}".format(answer.toRequest));
			if (answer.isReplyToSender)
				Typium.updateControls(Typium.etudCommPortForBrowserAction);
		}
	});

	Typium.updateControls(Typium.etudCommPortForBrowserAction);
});
