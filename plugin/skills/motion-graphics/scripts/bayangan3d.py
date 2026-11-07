"""bayangan3d - old name of shadow3d.py, kept so old imports and commands keep working (bayangan3d.py -> shadow3d).

Edit shadow3d.py, not this file. `import bayangan3d` gives the very same module object as `import shadow3d`; every old
(Indonesian) name is an alias inside shadow3d.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("shadow3d", run_name="__main__", alter_sys=True)
else:
    import shadow3d as _new
    sys.modules[__name__] = _new
