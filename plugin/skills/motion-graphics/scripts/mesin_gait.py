"""mesin_gait - old name of gait_engine.py, kept so old imports and commands keep working (mesin_gait.py -> gait_engine).

Edit gait_engine.py, not this file. `import mesin_gait` gives the very same module object as `import gait_engine`; every old
(Indonesian) name is an alias inside gait_engine.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("gait_engine", run_name="__main__", alter_sys=True)
else:
    import gait_engine as _new
    sys.modules[__name__] = _new
