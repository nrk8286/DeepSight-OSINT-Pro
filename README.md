# DeepSight-OSINT-Pro

An experimental toolkit for collecting basic Open-Source Intelligence (OSINT).

## Setup

This project uses the Python standard library and `pytest` for tests. To run
the tests:

```bash
pytest
```

## Usage

Currently the library exposes a single helper, `fetch_title`, which retrieves
the `<title>` field from any publicly accessible web page. If the page lacks a
`<title>` or cannot be fetched, an empty string is returned:

```python
from deepsight import fetch_title

print(fetch_title("https://example.com"))
```
