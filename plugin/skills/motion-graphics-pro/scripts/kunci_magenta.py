"""kunci_magenta - old name of magenta_key.py (kept so older commands keep working). Use magenta_key.py."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # python -I leaves the script folder out of sys.path
from magenta_key import *  # noqa: E402,F401,F403
from magenta_key import key, kunci, main  # noqa: E402,F401

if __name__ == "__main__":
    sys.exit(main())
