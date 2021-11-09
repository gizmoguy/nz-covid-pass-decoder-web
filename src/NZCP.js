import * as base32 from '@faustbrian/node-base32';
import * as cbor from 'cbor';


export class NZCovidPass {
    encodedText = ""
    raw  = null;
    data = {};

    constructor(nzcpStr) {
        // NZ Covid Pass structure:
        // CWT ==> CBOR serialization ==> {headers; CBOR; COSE signature} =>
        //
        // For more details, see https://nzcp.covid19.health.nz/

	    if (nzcpStr.substring(0,8) !== "NZCP:/1/") throw Error("missing NZCP header")

        // Remove the "NZCP:/1/" heading
        var nzcpBody = nzcpStr.substr(8);

        // Add Base32 Padding
        while ((nzcpBody.length % 8) !== 0) {
            nzcpBody += '=';
        }

        // Decode the base32 representation
        const cwt = base32.decode(nzcpBody).toString('hex');

        // Now we have the COSE message
        const results = cbor.decodeAllSync(cwt);
        const [protected_header, unprotected_header, payload, signature] = results[0].value;

        this.data = {
            header: cbor.decodeAllSync(protected_header),
            payload: cbor.decodeAllSync(payload),
            signature: signature
        }

        this.raw = cwt
        this.encodedText = nzcpStr
    }

    getRawCwt() { return this.raw; }

    getEncodedString() { return this.encodedText; }

    getKid() {
        let kid = null;
        kid = this.data.header[0].get(4)
        kid = kid.reduce ( (str, v) => str + String.fromCharCode(v), "") //uint8array -> bstr
//	    kid = btoa(kid) //bstr -> base64 - Storing kid in normal text rather than b64
        return kid;
    }

    getSignAlgorithm() {
//        return this.data.header[0].get(1)
        return "ES256"
    }

    getHCertJson() {
        let obj = {};
        this.data.payload[0].forEach(function(value, key){
            obj[key] = value;
        });
        return obj;
    }

    toRawString() {
        function map2json(map) {
            return Array.from(map).reduce((acc, [key, value]) => {
                if (value instanceof Uint8Array) {
                    acc[key] = value.data;
                }
                else if (value instanceof Map) {
                    acc[key] = map2json(value);
                } else {
                    acc[key] = value;
                }
        
                return acc;
            }, {})
        }

        let header = map2json(this.data.header[0]);
        let payload = map2json(this.data.payload[0]);
//        let signature = this.data.signature.reduce ( (str, v) => str + " " + v, "");
        let signature = JSON.stringify(this.data.signature);

        let out = `${JSON.stringify(header,null,2)},\n${JSON.stringify(payload,null,2)},\n${signature}`;

        return out;
    }

    toString() { this.getHCertJson() }


//    /*
//        Field values Decoding
//    */
//    decodeValue(valueType, id) {
//        const valueSet = valueSets[valueType].json;
//        if (!valueSet) {
//            console.warn("ValueSets not loaded for: "+id)
//            return id;
//        }
//        else {
//            return (valueSet.valueSetValues[id]) ? valueSet.valueSetValues[id].display : id;
//        }
//    }

    withDecodedValues() {
        // see 
        // https://github.com/ehn-dcc-development/ehn-dcc-schema

        let nzcpJSON = this.getHCertJson()
        console.log(nzcpJSON)

        // **TODO Need to sort schema in here
        const schema = {
            1 : {description: "Issuer", decoder: null},
            4 : {description: "Not Before", decoder: null},
            5 : {description: "Expiry", decoder: null},
//            jti : {description: "Expiry", decoder: null},
        }

//            vc : [
//                version : {description: "Schema version", decoder: null},
//                type : {description: "Type", decoder: null},
//                credentialSubject : {
//                    givenName : {description: "Name(s)", decoder: null},
//                    familyName : {description: "Surname(s)", decoder: null},
//                    dob : {description: "Date of birth", decoder: null}
//                }
//            ]



//        if (nzcpJSON["vc"]) {
//            schema.vc = vaccineSchema;
//            console.log('Vaccine Schema Found ' + schema)
//        }
//        else throw Error("unknown certificate type");

        // Decode the values before displaying them
        for (let g of Object.keys(nzcpJSON)) {
            console.log('Entry ' + g)
            let group = null;
            let schemagroup = null;
            switch (g) {
                case("vca"):
                    group = nzcpJSON[g][0]
                    schemagroup = schema[g][0]
                    //console.log(nzcpJSON[p][0])

                    for (let prop of Object.keys(group)) {
                        //console.log(prop)
                        const json = schemagroup[prop];
                        const decoder = schemagroup[prop].decoder;

//                        if (decoder) {
//                            if (typeof decoder === "function") {
//                                json.value = decoder(group[prop]);
//                            }
//                            else if (typeof decoder === "string") {
//                                json.value = this.decodeValue(decoder, group[prop]);
//                            }
//                        }
//                        else {
                            json.value = group[prop];
//                        }
                    }
                    break;

                case("credentialSubject"):
                    group = nzcpJSON[g]
                    schemagroup = schema[g]

                    for (let prop of Object.keys(group)) {
                        let json = schemagroup[prop]
                        const decoder = schemagroup[prop].decoder;

//                        if (decoder) {
//                            if (typeof decoder === "function") {
//                                json.value = decoder(group[prop]);
//                            }
//                            else if (typeof decoder === "string") {
//                                json.value = this.decodeValue(decoder, group[prop]);
//                            }
//                        }
//                        else {
                            json.value = group[prop];
//                        }
                    }
                    break;

                case "1":
                case "4":
                case "5":
                case "dob":
                case "ver":
                    console.log('Schema ' + schema[g])
                    console.log('VAL ' + nzcpJSON[g])
                    let json = schema[g]
                    json.value = nzcpJSON[g]

                default: break;
            }
        }
        
        return schema
    }
    
}

function dateFormat(dateStr) {
	const locale = (navigator.language) ? navigator.language : "en";

	const date = new Date(dateStr);
	return Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'long' }).format(date);
}

//const valueSets = {
//	"test-manf" : {
//		abbr: "ma",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-manf.json",
//		json: null
//	},
//	"country-codes": {
//		abbr: "co",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/country-2-codes.json",
//		json: null
//	},
//	"disease-agent-targeted": {
//		abbr: "tg",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/disease-agent-targeted.json",
//		json: null
//	},
//	"test-result": {
//		abbr: "tr",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-result.json",
//		json: null
//	},
//	"test-type": {
//		abbr: "tt",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/test-type.json",
//		json: null
//	},
//	"vaccine-mah-manf": {
//		abbr: "ma",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-mah-manf.json",
//		json: null
//	},
//	"vaccine-medicinal-product": {
//		abbr: "mp",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-medicinal-product.json",
//		json: null
//	},
//	"vaccine-prophilaxis": {
//		abbr: "vp",
//		url: "https://raw.githubusercontent.com/ehn-dcc-development/ehn-dcc-valuesets/release/2.0.0/vaccine-prophylaxis.json",
//		json: null
//	}
//}
//
//let valueSetsLoaded = false;
//
//// fetch valuesets jsons on load
//// to speed up dgc decoding
//function loadValueSets() {
//	const promises = []
//	Object.keys(valueSets).forEach( k => {
//		const elem = valueSets[k];
//		promises.push(
//			fetch(elem.url)
//			.then(res => res.json())
//			.then(json => elem.json = json)
//		)
//	})
//
//	Promise.all(promises).then(() => {
//		valueSetsLoaded = true;
//        console.info("Value sets loaded!")
//	})
//}
//window.addEventListener("load", loadValueSets());
