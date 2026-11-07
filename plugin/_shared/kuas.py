"""kuas - old name of brush.py, kept so old imports and commands keep working (kuas.py -> brush).

Edit brush.py, not this file. `import kuas` gives the very same module object as `import brush`; every old
(Indonesian) name is an alias inside brush.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("brush", run_name="__main__", alter_sys=True)
else:
    import brush as _new
    sys.modules[__name__] = _new
