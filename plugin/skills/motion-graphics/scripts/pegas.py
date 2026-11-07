"""pegas - old name of spring.py, kept so old imports and commands keep working (pegas.py -> spring).

Edit spring.py, not this file. `import pegas` gives the very same module object as `import spring`; every old
(Indonesian) name is an alias inside spring.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("spring", run_name="__main__", alter_sys=True)
else:
    import spring as _new
    sys.modules[__name__] = _new
