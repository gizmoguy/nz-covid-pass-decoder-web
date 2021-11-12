import * as base32 from '@faustbrian/node-base32';
import * as cbor from 'cbor';
import * as uuid from 'uuid';


export class NZCovidPass {
    encodedText = ""
    raw  = null;
    data = {};

    constructor(nzcpStr) {
        // NZ Covid Pass structure:
        // CWT ==> CBOR serialization ==> {headers; CBOR; COSE signature} =>
        //
        // For more details, see https://nzcp.covid19.health.nz/

        const nzcpDataSegments = nzcpStr.split("/")

        if (nzcpDataSegments[0] !== "NZCP:") throw Error("missing NZCP header")
        if (nzcpDataSegments[1] !== "1") throw Error("unsupported NZCP version number")

        // Remove the "NZCP:/1/" heading
        var nzcpBody = nzcpDataSegments[2]

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
        return kid;
    }

    getSignAlgorithm() {
        return this.data.header[0].get(1);
    }

    getNZCPJson() {
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
        let signature = JSON.stringify(this.data.signature);

        let out = `${JSON.stringify(header,null,2)},\n${JSON.stringify(payload,null,2)},\n${signature}`;

        return out;
    }

    toString() { this.getNZCPJson() }

    withDecodedValues() {
        // see
        // https://nzcp.covid19.health.nz/#data-model

        let nzcpJSON = this.getNZCPJson()

        const claims = {
            1 : "iss",
            4 : "exp",
            5 : "nbf",
            7 : "cti"
        }

        const schema = {
            iss : {description: "Issuer", decoder: null},
            exp : {description: "Expiry", decoder: null},
            nbf : {description: "Not Before", decoder: null},
            cti : {description: "CWT Token ID", decoder: null},
            jti : {description: "JWT Token ID", decoder: null},
            vc : {
                '@context' : {description: "Verifiable credential context", decoder: null},
                version : {description: "Schema version", decoder: null},
                type : {description: "Type", decoder: null},
                credentialSubject : {
                    givenName : {description: "Given Name", decoder: null},
                    familyName : {description: "Family Name", decoder: null},
                    dob : {description: "Date of birth", decoder: null}
                }
            }
        }

        // Decode the values before displaying them
        for (let g of Object.keys(nzcpJSON)) {
            switch (g) {
                case "1":
                    schema[claims[g]].value = nzcpJSON[g]
                    break;

                case "vc":
                    for (let prop of Object.keys(nzcpJSON[g])) {
                        switch (prop) {
                            case "@context":
                            case "version":
                            case "type":
                                schema[g][prop].value = nzcpJSON[g][prop];
                                break;

                            case "credentialSubject":
                                for (let subj of Object.keys(nzcpJSON[g][prop])) {
                                    schema[g][prop][subj].value = nzcpJSON[g][prop][subj];
                                }
                                break;

                            default: break;
                        }
                    }
                    break;

                case "4":
                case "5":
                    schema[claims[g]].value = new Date(nzcpJSON[g] * 1000)
                    break;

                case "7":
                    let cti = nzcpJSON[g];
                    let jti = 'urn:uuid:' + uuid.stringify(cti)
                    schema[claims[g]].value = cti;
                    schema["jti"].value = jti
                    break;

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
