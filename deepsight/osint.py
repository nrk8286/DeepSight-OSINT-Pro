"""Basic OSINT helper functions."""

from __future__ import annotations

import re
import urllib.request
from urllib.error import URLError


def fetch_title(url: str) -> str:
    """Retrieve the HTML title for a given URL.

    This simple function demonstrates basic open-source intelligence (OSINT)
    by fetching publicly available web content and extracting the ``<title>``
    field.

    Parameters
    ----------
    url:
        The web address to query.

    Returns
    -------
    str
        The text inside the page's ``<title>`` tag or an empty string if not
        found or the page cannot be retrieved.
    """
    try:
        with urllib.request.urlopen(url) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except URLError:
        return ""

    match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""
