// UI wrappers

export function reset() {
	const nzcpform = document.getElementsByClassName("nzcp input");
	for (let elem of nzcpform) elem.value = null;

	document.getElementById("nzcp-json").innerText = "";
	document.getElementById("error-bar").hidden = true;
        document.getElementById("progress").classList.remove("is-hidden");
	document.getElementById("signature-invalid-notification").hidden = true;
	document.getElementById("signature-verified-notification").hidden = true;
	document.getElementById("qr-decoded-content").innerText = "";
	getQRCanvas().height += 0; //clean preview

	document.getElementById("cert-type").innerText = "";
	document.getElementById("common-group").hidden = true;

	signatureDetails.hidden = true;
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

document.querySelector("#nzcpHumanReadableToggle").addEventListener("click", event => {
    toggleDecodedNZCPView(event.target.checked)
});

export function toggleDecodedNZCPView(checked) {
	document.querySelector("#nzcp-code").hidden = checked;
	document.querySelector("#nzcp-hr").hidden = !(checked);
}

// Apply toggle default state
window.addEventListener("load", () => {
	const toggle = document.querySelector("#nzcpHumanReadableToggle");
	toggleDecodedNZCPView(toggle.checked)
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
	document.querySelector("#nzcp-json").textContent = errtext;
	document.querySelector("#error-text").textContent = err;
	document.querySelector("#error-bar").hidden = false;
	document.querySelector("#progress").classList.add("is-hidden");
}

export function showDecodedText(text) {
	document.querySelector("#qr-decoded-content").innerText = text
}


export function showDecodedNZCPGroup(type) {
    document.getElementById("load-tip").hidden = true;

    const cert_type = document.getElementById("cert-type")

    switch(type) {
        case("PublicCovidPass"):
            cert_type.innerText = "NZ Public COVID Pass";
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
// of the nzcp fields
//
export function displayDecodedNZCP(nzcpJSON) {
	// Enable the necessary UI sections
	let type = nzcpJSON.vc.type.value[1];
	showDecodedNZCPGroup(type);

	// Fill the UI

	// Display the top-level properties(ver,nbf,exp,cti)
	document.getElementById("iss").innerText = nzcpJSON.iss.value;
	document.getElementById("ver").innerText = nzcpJSON.vc.version.value;
	document.getElementById("nbf").value = nzcpJSON.nbf.value;
	document.getElementById("exp").value = nzcpJSON.exp.value;
	document.getElementById("jti").value = nzcpJSON.jti.value;

	// Display the person's name group properties
	for (let p of Object.keys(nzcpJSON.vc.credentialSubject)) {
		const textbox = document.getElementById(p);
		textbox.value = nzcpJSON.vc.credentialSubject[p].value;
	}
}


// Display raw certificate values
export function displayRawText(text) {
    document.querySelector("#nzcp-raw").textContent = text
}
export function displayRawNZCP(json) {
    document.querySelector("#nzcp-json").textContent = json
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

	/* fetch("assets/nzcp_public_keys.json.json")
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

export const scannerVideo = document.getElementById("camera-stream")

export const scanner = document.getElementById("qr-scanner")
