"""ukurref - old name of measure_ref.py, kept so old imports and commands keep working (ukurref.py -> measure_ref).

Edit measure_ref.py, not this file. `import ukurref` gives the very same module object as `import measure_ref`; every old
(Indonesian) name is an alias inside measure_ref.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("measure_ref", run_name="__main__", alter_sys=True)
else:
    import measure_ref as _new
    sys.modules[__name__] = _new
