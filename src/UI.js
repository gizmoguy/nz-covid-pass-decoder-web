// UI wrappers

export function reset() {
	const dgcform = document.getElementsByClassName("dgc input");
	for (let elem of dgcform) elem.value = null;

	document.getElementById("dgc-json").innerText = "";
	document.getElementById("error-bar").hidden = true;
    document.getElementById("progress").classList.remove("is-hidden");
	document.getElementById("signature-invalid-notification").hidden = true;
	document.getElementById("signature-verified-notification").hidden = true;
	document.getElementById("qr-decoded-content").innerText = "";
	getQRCanvas().height += 0; //clean preview 

	document.getElementById("cert-type").innerText = "";
	document.getElementById("common-group").hidden = true;
	document.getElementById("vaccination-group").hidden = true;
	document.getElementById("recovery-group").hidden = true;
	document.getElementById("test-group").hidden = true;

	signatureDetails.hidden = true;
	document.getElementById("cert-co").innerText = "unavailable"
	document.getElementById("kid").innerText = "";
	document.getElementById("alg").innerText = ""

}

// Progress indicator 
export function setProgressText(msg) {
	document.getElementById("progress-text").innerText = msg;
}


// PREVIEW CANVAS

export function getQRCanvas() {
    return document.getElementById("qr-canvas");
}

export function showQRCanvas() {
	document.getElementById("drag-drop-text").hidden = true
	document.getElementsByClassName("canvas-wrapper")[0].classList.remove("is-hidden")
}

export function hideQRCanvas() {
	document.getElementById("drag-drop-text").hidden = false
	document.getElementsByClassName("canvas-wrapper")[0].classList.add("is-hidden")
}



// Human Readable TOGGLE

document.querySelector("#dgcHumanReadableToggle").addEventListener("click", event => {
    toggleDecodedHCertView(event.target.checked)
});

export function toggleDecodedHCertView(checked) {
	document.querySelector("#dgc-code").hidden = checked;
	document.querySelector("#dgc-hr").hidden = !(checked);
}

// Apply toggle default state
window.addEventListener("load", () => {
	const toggle = document.querySelector("#dgcHumanReadableToggle");
	toggleDecodedHCertView(toggle.checked)
});


// Signature details TOGGLE

export const signatureDetailsToggle = document.querySelector("#displaySignatureDetailsToggle")
const signatureDetails = document.querySelector("#signature-details-field")

function toggleSignatureDetails(checked) {
	signatureDetails.hidden = !checked;
}
signatureDetailsToggle.addEventListener("click", event => {
    toggleSignatureDetails(event.target.checked)
});



// ERROR BAR

export function showErrorMessage(err,err_header) {
	console.warn("NOT A NZCP: "+err)
	// Show error message
	const errtext = err_header+"\n"+err;
	document.querySelector("#dgc-json").textContent = errtext;
	document.querySelector("#error-text").textContent = err;
	document.querySelector("#error-bar").hidden = false;
	document.querySelector("#progress").classList.add("is-hidden");
}

export function showDecodedText(text) {
	document.querySelector("#qr-decoded-content").innerText = text
}


// Vaccine/Test/Recovery group display manager
export function showDecodedHCertGroup(type) {
    document.getElementById("load-tip").hidden = true;

    const vgroup = document.getElementById("vaccination-group");
	const rgroup = document.getElementById("recovery-group");
	const tgroup = document.getElementById("test-group");

	const cert_type = document.getElementById("cert-type")

    switch(type) {
        case("v"):
            vgroup.hidden = false;
            cert_type.innerText = "Vaccination"
            break;
        case("r"):
            rgroup.hidden = false;
            cert_type.innerText = "Recovery"
            break;
        case("t"):
            tgroup.hidden = false;
            cert_type.innerText = "Test"
            break;
        default:
            throw Error("invalid certificate type")
            break;
    }

	document.getElementById("common-group").hidden = false;
	document.getElementById("person-group").hidden = false;

}



//
// Fills the UI with human readable values
// of the dgc fields
//
export function displayDecodedVC(covidpassJSON) {

	// Enable the necessary UI sections
	let type = null;
	if ("v" in covidpassJSON) {
		type = "v"
	}
	else if ("r" in covidpassJSON) {
		type = "r"
	}
	else if ("t" in covidpassJSON) {
		type = "t"
	}
	else throw Error("invalid certificate type");
	showDecodedHCertGroup(type)

	// Fill the UI

	// Display the top-level properties(dob, ver)
	document.getElementById("dob").value = covidpassJSON.dob.value
	document.getElementById("ver").innerText = covidpassJSON.ver.value

	// Display the person's name group properties
	for (let p of Object.keys(covidpassJSON.nam)) {
		const textbox = document.getElementById(p);
		textbox.value = covidpassJSON.nam[p].value
	}

	// Display the type specific group properties
	// v | r | t
	const type_group = covidpassJSON[type][0]
	for (let p of Object.keys(type_group)) {
		const textbox = document.getElementById(type+"-"+p);
		textbox.value = type_group[p].value
	}

}


// Display raw certificate values
export function displayRawText(text) {
    document.querySelector("#dgc-raw").textContent = text
}
export function displayRawHCERT(json) {
    document.querySelector("#dgc-json").textContent = json
}


export function displaySignatureResult(isAuthentic) {
    document.getElementById("progress").classList.add("is-hidden");
    switch(isAuthentic) {
        case (null): // no keys available for validation
            break; 
        case (false):
            document.getElementById("signature-invalid-notification").hidden = false;
            break;
        case(true):
            document.getElementById("signature-verified-notification").hidden = false;
            break;
        default:
            break;
    }
}

export function displaySignatureDetails(kid, alg) {
	let displayStatus = signatureDetailsToggle.checked
	if (displayStatus === true) {
		signatureDetails.hidden = false
	}

	document.getElementById("kid").innerText = kid;

	/* fetch("assets/it_dgc_public_keys.json")
	.then(res => res.json())
	.then(keys => {
		document.getElementById("pubkey-pem").innerText = keys[kid][0]
	})
	.catch(e => {
		console.error(e)
	}) */

	const alg_decoder = {
		"-37": "PS256 (RSASSA-PSS w/ SHA-256)",
		"-7" : "ES256 (ECDSA w/ SHA-256)",	
	}
	/* const alg_decoder = {
		"-39": "RSASSA-PSS w/ SHA-512",
		"-38": "RSASSA-PSS w/ SHA-384",
		"-37": "RSASSA-PSS w/ SHA-256",
		"-36": "ECDSA w/ SHA-512",
		"-35": "ECDSA w/ SHA-384",

		"-15": "SHA-2 256-bit Hash",
		"-15": "SHA-2 256-bit Hash truncated to 64-bits",
		"-14": "SHA-1 Hash",
		
		"-8": "EdDSA",
		"-7": "ECDSA w/ SHA-256",
		"4": "HMAC w/ SHA-256 truncated to 64 bits",
		"5": "HMAC w/ SHA-256",
		"6": "HMAC w/ SHA-384",
		"7": "HMAC w/ SHA-512",
	} */

	document.getElementById("alg").innerText = (alg_decoder[alg]) ? alg_decoder[alg] : alg;
}

export function displaySigner(str) {
	document.getElementById("cert-co").innerText = str
}


export const scannerVideo = document.getElementById("camera-stream")

export const scanner = document.getElementById("qr-scanner")