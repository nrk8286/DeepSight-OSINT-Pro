"""Tests for the deepsight OSINT helpers."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from deepsight import fetch_title


def test_fetch_title_example_domain():
    """Real network call to example.com returns its title."""
    assert fetch_title("https://example.com") == "Example Domain"


def test_fetch_title_handles_missing_resource(tmp_path):
    """A non-existent file URL should return an empty string rather than error."""
    missing_file = (tmp_path / "missing.html").as_uri()
    assert fetch_title(missing_file) == ""

