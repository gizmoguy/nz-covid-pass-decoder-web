import jsqr from 'jsqr';
import QRCode from "qrcode";
import QrScanner from "qr-scanner";

import {NZCovidPass} from './NZCP'
import * as signature from './signature'
import * as UI from './UI'

console.log("😃✔️👍")

// DRAG & DROP
const dropArea = document.getElementById('drop-area');

dropArea.addEventListener('dragover', (event) => {
  event.stopPropagation();
  event.preventDefault();
  // Style the drag-and-drop as a "copy file" operation.
  event.dataTransfer.dropEffect = 'copy';
});

dropArea.addEventListener('drop', (event) => {
  event.stopPropagation();
  event.preventDefault();
  const fileList = event.dataTransfer.files;
  reader.readAsDataURL(fileList[0]);
});


// FILE SELECTOR
// Repeat computation when user re-selects the same file
document.querySelector("#file-selector").addEventListener('click', event => {
	event.target.value = null;
});

// Load the image as a dataurl to get the correct image size.
// The ImageData constructor requires width and height
document.querySelector("#file-selector").addEventListener('change', event => {
	reader.readAsDataURL(event.target.files[0]);
});

// new FileReader object
let reader = new FileReader();

// event fired when file reading failed
reader.addEventListener('error', () => {
	alert('Error : Failed to read file');
});

// event fired when file reading finished
reader.addEventListener('load', async (e) => {
	UI.reset();
	UI.setProgressText("Processing image data")

    // Read the file content
	let file = e.target.result;
	if (file.substr(0,10) != "data:image") {
		UI.hideQRCanvas()
		UI.showErrorMessage(Error("file is not an image"), "Cannot load this file")
		return ;
	}
		
	
	// Decode the DCC QR-code and process it
	//UI.scanner.hidden = true	
	let rawstring = null; 
	try {
		rawstring = await decodeQR(file)
		console.log(rawstring)
		
		// Decode the DGC and display its content
		loadNZCPFromString(rawstring)
		.catch(err => {
			UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
		});
	}
	catch(err) {
		UI.hideQRCanvas();
		UI.showErrorMessage(err, "This file doesn't contain a valid QR-code")
	}
	
});

async function loadNZCPFromString(rawstring) {
	UI.showDecodedText(rawstring)
	
	// Load QR Preview
	const canvas = UI.getQRCanvas()
	beautifyQR(rawstring, canvas)
	UI.showQRCanvas();

	// Load the DCC
	UI.setProgressText("Decoding Green Certificate")
	if (!rawstring) throw Error("Invalid DGC: "+rawstring)
	let nzcp = new NZCovidPass(rawstring);

	let rawnzcp = nzcp.getRawCwt()
	let kid = nzcp.getKid()
	let algid = nzcp.getSignAlgorithm()
	
	// Display the Certificate content)
	// raw content
	UI.displayRawText(nzcp.getEncodedString())
	UI.displayRawHCERT(nzcp.toRawString())
	// parsed content
	const hrnzcp = nzcp.withDecodedValues()
	UI.displayDecodedHCERT(hrnzcp);

	// Signature Verification!
	UI.setProgressText("Verifying signature")
	signature.verify(rawnzcp, kid)
	.then(isAuthentic => {
		UI.displaySignatureResult(isAuthentic);
	})
	UI.displaySignatureDetails(kid, algid);

//	// Signature/Cert details - Not required as we just have a public key
//	signature.getIdentityFromKID(kid, algid)
//	.then(cert => {
//		UI.displaySignatureDetails(kid, algid);
//		if (cert) {
//			let subject = `${cert.subject.commonName} (${cert.subject.countryName})`;
//			let issuer = `${cert.issuer.commonName} (${cert.issuer.countryName})`;
//			UI.displaySigner(`${subject}, issued by ${issuer}`)
//		}
//		else {
//			UI.displaySigner(`unknown`)
//		}
//	})
}

// QR SCANNER
QrScanner.WORKER_PATH = 'qr-scanner-worker.min.js';
const qrScanner = new QrScanner(UI.scannerVideo, rawstring => {
	qrScanner.stop();
	navigator.vibrate(200);
	UI.scanner.hidden = true;
	
	// Decode the nzcp and display its content
	console.log(rawstring)
	loadNZCPFromString(rawstring)
	.catch(err => {
		UI.showErrorMessage(err,"This is not an EU Digital COVID Certificate")
		UI.hideQRCanvas()
	});
});

document.getElementById("start-scan").addEventListener("click", event => {
	UI.reset();
	UI.hideQRCanvas();
	UI.scanner.hidden = false;
	qrScanner.start()
	.catch(err => alert(err+"\nThe camera stream is only available on HTTPS"))
})


// FUNCTIONS


// Convert a Data URL image into an ImageData structure via the Canvas API
// See https://stackoverflow.com/questions/51869520/image-to-uint8array-in-javascript
async function imageDataUrlToImageData(image, context) {
	return new Promise((resolve, reject) => {
		context.width = image.width;
		context.height = image.height;
		context.drawImage(image, 0, 0);

		if (!context.width) {
			canvas.width = 300;
			canvas.height = 300;
			reject("not a valid image file");
			}

		resolve(context.getImageData(0,0,context.width, context.height));
	});
}

// QR DECODER
//
// uses 2 libs for a better detection
// as QrScanner is faster than jsqr but can't detect some barcodes
// (mostly rotated and logoed qr-codes)
async function decodeQR(imageDataUrl) {
	let decoded = null;
	// TODO: Experiment with a Promise.any() based fallback instead of try-catch
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
	try {
		decoded = await QrScanner.scanImage(imageDataUrl)
		return decoded;
	}
	catch { //fallback to the old qr decoder procedure if QrScanner fails
		console.info("QrScanner detection failed, falling back to jsqr")
		// create an image structure to get the image size (width, height)
		async function createImage(file) {
			return new Promise( (resolve, reject) => {
				if (!file) reject();
				let img = new Image()
				img.src = file;
				resolve(img) ;
			})
		}

		const img = await createImage(imageDataUrl);

		// Now we use a canvas to convert the dataurl image into an ImageData structure
		// This is needed to decode the QR code with jsQR 

		const canvas = UI.getQRCanvas()
		canvas.width = img.width;
		canvas.height = img.height;

		const context = canvas.getContext('2d')
		const imgdata = await imageDataUrlToImageData(img, context)

		decoded = jsqr(imgdata.data, imgdata.width, imgdata.height);
		
		if(decoded) return decoded.data;
		else throw Error("no QR-code detected")
	}
}


// Redraw QR 
function beautifyQR(str, canvas) {
	const SIZE = 600;
	canvas.width = SIZE; 
	canvas.height = SIZE;

	// see https://github.com/soldair/node-qrcode

	const config = {
		errorCorrectionLevel: 'H',
		type: "image/png"
	}

	QRCode.toDataURL(str, config)
		.then(qr => {
			const img = new Image();
			img.src = qr;
			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				const context = canvas.getContext("2d");
				context.drawImage(img, 0, 0)
			}
		})
		.catch(err => {
			console.error("qr-code beautify",err)
		})

}
