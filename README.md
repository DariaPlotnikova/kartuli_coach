# Kartuli Coach

## Local testing

The coach loads exercises with `fetch`, so browsers will block the JSON files when `simple_kartuli.html` is opened directly with a `file://` URL. Start a local static HTTP server from this directory instead:

```bash
cd kartuli
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/simple_kartuli.html
```

GitHub Pages serves the files over HTTPS, so no local-server step is needed for the deployed app.
