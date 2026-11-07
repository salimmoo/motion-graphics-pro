"""rongga - old name of cavity.py, kept so old imports and commands keep working (rongga.py -> cavity).

Edit cavity.py, not this file. `import rongga` gives the very same module object as `import cavity`; every old
(Indonesian) name is an alias inside cavity.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("cavity", run_name="__main__", alter_sys=True)
else:
    import cavity as _new
    sys.modules[__name__] = _new
