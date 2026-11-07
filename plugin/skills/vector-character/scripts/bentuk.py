"""bentuk - old name of shapes.py, kept so old imports and commands keep working (bentuk.py -> shapes).

Edit shapes.py, not this file. `import bentuk` gives the very same module object as `import shapes`; every old
(Indonesian) name is an alias inside shapes.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("shapes", run_name="__main__", alter_sys=True)
else:
    import shapes as _new
    sys.modules[__name__] = _new
