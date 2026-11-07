"""gaya - old name of styles.py, kept so old imports and commands keep working (gaya.py -> styles).

Edit styles.py, not this file. `import gaya` gives the very same module object as `import styles`; every old
(Indonesian) name is an alias inside styles.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("styles", run_name="__main__", alter_sys=True)
else:
    import styles as _new
    sys.modules[__name__] = _new
