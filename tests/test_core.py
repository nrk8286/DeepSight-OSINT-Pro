from deepsight_osint_pro import fetch_sources

def test_fetch_sources_returns_default_list():
    assert fetch_sources() == ["news", "social_media", "public_records"]
