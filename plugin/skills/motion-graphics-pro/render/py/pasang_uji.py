"""pasang_uji - old module name of install_test.py (kept so older commands and imports keep working). Use install_test.py."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python -I leaves the script folder out of sys.path
import install_test as _m  # noqa: E402
from install_test import *  # noqa: E402,F401,F403

# private helpers too (import * skips names starting with "_"); module state (e.g. _K) is read through __getattr__
globals().update({n: getattr(_m, n) for n in dir(_m) if n.startswith("_") and not n.startswith("__") and callable(getattr(_m, n))})


def __getattr__(name):
    return getattr(_m, name)


if __name__ == "__main__":
    sys.exit(_m.main())
