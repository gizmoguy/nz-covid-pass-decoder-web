<h1 align="center">
  <br>
  NZ COVID Pass decoder
  <br>
</h1>

A Progressive Web App that can read the NZ COVID Pass QR-codes.

It was written by [floysh](https://github.com/floysh/DCC-green-pass-decoder) for decoding
EU Digital COVID Certificates and adapted by [Brad Cowie](https://github.com/gizmoguy) and
[Peter Lambrechtsen](https://github.com/plambrechtsen) to support reading NZ COVID Pass QR codes.

Unlike other decoders available online, it doesn't require to set up dependencies or upload the
certificate to a remote server. It can be used by average users without having to interact with the
terminal (scary! hacker stuff! 🐱‍💻).

All the processing is done locally and your certificate never leaves your device.

<br>

#### 🚀 Try it live on https://nz-covid-pass.github.io/web-nz-covid-pass-decoder/

<br>

## Features
* No need to set up an environment: just load the page and you're ready to scan! 😎
* Progressive Web App, can work offline and be installed on many devices like a native app.
* Can both display the raw certificate or parse it to make the fields human readable.
* Can both load the QR-code from an existing file or scan it using the device camera (mobile devices only)
* Signature validation

<br>

## Resources

* [NZ COVID Pass Specification](https://nzcp.covid19.health.nz/)

* [Some test QR-codes](https://github.com/minhealthnz/nzcovidpass-spec/tree/main/spec/examples)
