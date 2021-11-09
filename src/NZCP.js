import * as base32 from '@faustbrian/node-base32';
import * as cbor from 'cbor';

export class NZCovidPass {
    encodedText = ""
    raw  = null;
    data = {};

    constructor(nzcovidpassStr) {
        const nzcovidpassSegments = nzcovidpassStr.split("/")

        if (nzcovidpassSegments[0] !== "NZCP:") throw Error("missing NZCP header")
        if (nzcovidpassSegments[1] !== "1") throw Error("bad NZCP version number")

        // Decode the base32 representation
        // TODO: Handle padding
        const decodedData = base32.decode(nzcovidpassSegments[2]);

        const cwt = decodedData.toString('hex')

        // Now we have the COSE message
        const results = cbor.decodeAllSync(cwt);
        const [protected_header, unprotected_header, payload, signature] = results[0].value;

        this.data = {
            header1: cbor.decodeAllSync(protected_header),
            header2: unprotected_header,
            payload: cbor.decodeAllSync(payload),
            signature: signature
        }

        this.raw = cwt
        this.encodedText = nzcovidpassStr
    }

    getRawCwt() { return this.raw; }

    getEncodedString() { return this.encodedText; }

    getKid() {
        let kid = null;
        kid = this.data.header1[0].get(4)
        if (!kid) {
            kid = this.data.header2.get(4)
            if (!kid) throw Error("no kid in headers")
        }
        kid = kid.reduce ( (str, v) => str + String.fromCharCode(v), "") //uint8array -> bstr
	    kid = btoa(kid) //bstr -> base64
        return kid;
    }

    getSignAlgorithm() {
        return this.data.header1[0].get(1)
    }

    getVCJson() {
        return this.data.payload[0].get('vc')
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

        let header1 = map2json(this.data.header1[0]);
        let header2 = map2json(this.data.header2);
        let payload = map2json(this.data.payload[0]);
        let signature = this.data.signature.reduce ( (str, v) => str + " " + v, "");
        //let signature = JSON.stringify(this.data.signature);

        let out = `${JSON.stringify(header1,null,2)},\n${JSON.stringify(header2,null,2)},\n${JSON.stringify(payload,null,2)},\n${signature}`;

        return out;
    }

    toString() { this.getVCJson() }

    /*
        Field values Decoding
    */
    decodeValue(valueType, id) {
        const valueSet = valueSets[valueType].json;
        if (!valueSet) {
            console.warn("ValueSets not loaded for: "+id)
            return id;
        }
        else {
            return (valueSet.valueSetValues[id]) ? valueSet.valueSetValues[id].display : id;
        }
    }

    withDecodedValues() {
        // see
        // https://nzcp.covid19.health.nz/#data-model
        let covidpassJSON = this.getVCJson()

        console.log(covidpassJSON)
        // TODO implement NZ COVID Pass schema

        const schema = {
            nam : {
                fnt : {description: "Standardised name(s)", decoder: null},
                fn : {description: "Name(s)", decoder: null},
                gnt : {description: "Standardised surname(s)", decoder: null},
                gn : {description: "Surname(s)", decoder: null},
                },
            ver : {description: "Schema version", decoder: null},
            dob : {description: "Date of birth", decoder: null}
        }

        const vaccineSchema = [
            {
                dn : {description: "Dose number", decoder: null},
                ma : {description: "Vaccine manufacturer or Marketing Authorization Holder", decoder: "vaccine-mah-manf"},
                vp : {description: "Vaccine or prophilaxis", decoder: "vaccine-prophilaxis"},
                dt : {description: "Date of vaccination", decoder: null},
                co : {description: "Country of vaccination", decoder: "country-codes"},
                ci : {description: "Unique certificate identifier (UVCI)", decoder: null},
                mp : {description: "Vaccine or medicinal product", decoder: "vaccine-medicinal-product"},
                is : {description: "Certificate issuer", decoder: null},
                sd : {description: "Total series of doses", decoder: null},
                tg : {description: "Disease or agent targeted", decoder: "disease-agent-targeted"},
            }
        ];
        const recoverySchema = [
            {
                du : {description: "Certificate valid until", field_id: "r-du", decoder: null},
                co : {description: "Country", field_id: "r-co", decoder: "country-codes"},
                ci : {description: "Unique certificate identifier (UVCI)", field_id: "r-ci", decoder: null},
                is : {description: "Certificate issuer", field_id: "r-is", decoder: null},
                tg : {description: "Disease or agent targeted", field_id: "r-tg", decoder: "disease-agent-targeted"},
                df : {description: "Certificate valid from", field_id: "r-df", decoder: null},
                fr : {description: "Date of first positive NAA test result", field_id: "r-fr", decoder: null}
            }
        ];
        const testSchema = [
            {
                sc : {description: "Date and time of sample collection", field_id: "t-sc", decoder: dateFormat},
                ma : {description: "RAT test name and manufacturer", field_id: "t-ma", decoder: "test-manf"},
                dr : {description: "Date and time of test result", field_id: "t-dr", decoder: dateFormat},
                tt : {description: "Type of Test", field_id: "t-tt", decoder: "test-type"},
                nm : {description: "Nucleic acid amplification test name", field_id: "t-nm", decoder: null},
                co : {description: "Country of test", field_id: "t-co", decoder: "country-codes"},
                tc : {description: "Testing centre", field_id: "t-tc", decoder: null},
                ci : {description: "Unique certificate identifier (UVCI)", field_id: "t-ci", decoder: null},
                is : {description: "Certificate issuer", field_id: "t-is", decoder: null},
                tg : {description: "Disease or agent targeted", field_id: "t-tg", decoder: "disease-agent-targeted"},
                tr : {description: "Test result", field_id: "t-tr", decoder: "test-result"},
            }
        ];

        if (covidpassJSON["v"]) {
            schema.v = vaccineSchema;
        }
        else if (covidpassJSON["r"]) {
            schema.r = recoverySchema;
        }
        else if (covidpassJSON["t"]) {
            schema.t = testSchema;
        }
        else throw Error("unknown certificate type");

        // Decode the values before displaying them
        // https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-certificates_dt-specifications_en.pdf

        for (let g of Object.keys(covidpassJSON)) {
            let group = null;
            let schemagroup = null;
            switch (g) {
                case("v"):
                case("r"):
                case("t"):
                    group = covidpassJSON[g][0]
                    schemagroup = schema[g][0]
                    //console.log(covidpassJSON[p][0])

                    for (let prop of Object.keys(group)) {
                        //console.log(prop)
                        const json = schemagroup[prop];
                        const decoder = schemagroup[prop].decoder;

                        if (decoder) {
                            if (typeof decoder === "function") {
                                json.value = decoder(group[prop]);
                            }
                            else if (typeof decoder === "string") {
                                json.value = this.decodeValue(decoder, group[prop]);
                            }
                        }
                        else {
                            json.value = group[prop];
                        }
                    }
                    break;

                case("nam"):
                    group = covidpassJSON[g]
                    schemagroup = schema[g]

                    for (let prop of Object.keys(group)) {
                        let json = schemagroup[prop]
                        const decoder = schemagroup[prop].decoder;

                        if (decoder) {
                            if (typeof decoder === "function") {
                                json.value = decoder(group[prop]);
                            }
                            else if (typeof decoder === "string") {
                                json.value = this.decodeValue(decoder, group[prop]);
                            }
                        }
                        else {
                            json.value = group[prop];
                        }
                    }
                    break;

                case "dob":
                case "ver":
                    let json = schema[g]
                    json.value = covidpassJSON[g]

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
