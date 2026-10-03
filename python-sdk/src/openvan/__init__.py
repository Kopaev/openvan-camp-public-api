"""OpenVan.camp — free vanlife / RV travel data API client. No API key.

https://openvan.camp/docs · data CC BY 4.0
"""

from .api import OpenVan
from .client import OpenVanClient, OpenVanError, __version__

__all__ = ["OpenVan", "OpenVanClient", "OpenVanError", "__version__"]
