# AUTO-GENERATED COPY of _shared/atelier_citra.py (run _shared/sync.py after editing the source). Do not edit here.
"""atelier_citra - old name of image_ops.py, kept so old imports and commands keep working (atelier_citra.py -> image_ops).

Edit image_ops.py, not this file. `import atelier_citra` gives the very same module object as `import image_ops`; every old
(Indonesian) name is an alias inside image_ops.py.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if __name__ == "__main__":
    import runpy
    runpy.run_module("image_ops", run_name="__main__", alter_sys=True)
else:
    import image_ops as _new
    sys.modules[__name__] = _new
