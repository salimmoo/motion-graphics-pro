"""ruang3d - old name of space3d.py, kept so old imports and commands keep working (ruang3d.py -> space3d).

Edit space3d.py, not this file. `import ruang3d` gives the very same module object as `import space3d`; every old
(Indonesian) name is an alias inside space3d.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("space3d", run_name="__main__", alter_sys=True)
else:
    import space3d as _new
    sys.modules[__name__] = _new
