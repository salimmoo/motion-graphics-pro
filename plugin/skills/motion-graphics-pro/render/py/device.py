"""device - shared device manager of mgp (Motion Graphics Pro). Old module name: perangkat.py (thin shim kept).

Used by the mgp Python scripts (voice_engine.py, image_engine.py, install_test.py) for:
  1. probe()       : CPU, free RAM, GPU (vendor, total/free VRAM), PyTorch build. Never fails when a tool is missing.
  2. decide()      : pick "cuda" | "cuda+offload" | "cpu" (or "mps") from the task's memory estimate + margin,
                     with a reason (English, or Indonesian with MGP_LANG=id).
  3. GpuLock       : GPU queue across processes/agents/sessions through a lock file; one GPU job at a time.
  4. use_gpu()     : context manager = decide + lock (+ wait, then fall back to CPU when the GPU stays busy).
  5. run()         : run a function on the chosen device; when CUDA runs out of memory midway,
                     release the GPU, retry on the CPU and report it.

Example (Python, e.g. for `mgp image`):

    import device as pk
    def work(k):                        # k: Decision; k.torch = "cuda" | "cpu" | "mps"
        pipe = load_model(k.torch, offload=(k.device == "cuda+offload"))
        return pipe(prompt)
    result, k = pk.run("image flux", work, task="flux-schnell")
    # or by hand:
    with pk.use_gpu("image flux", task="flux-schnell") as k:
        ...

Env (MGP_* first, then the old REKAM_* name):
  MGP_DEVICE=auto|cpu|cuda|mps   force a device (default auto)                       (old REKAM_DEVICE)
  MGP_GPU_WAIT=<seconds>         how long to wait for a busy GPU before falling back to CPU (default 120)  (REKAM_GPU_TUNGGU)
  MGP_GPU_LOCK=<file>            lock file location (default %LOCALAPPDATA%\\rekam\\gpu.lock or ~/.cache/rekam/gpu.lock;
                                 the folder name stays "rekam" so old and new tool versions share one GPU queue)  (REKAM_GPU_KUNCI)
  MGP_GPU_LIMIT=<GB>             TESTING ONLY: limit CUDA memory of this process (triggers OOM to test the CPU fallback)  (REKAM_GPU_BATAS)

CLI:
  python device.py profile                    machine profile JSON (used by `mgp doctor`)
  python device.py decide --task chatterbox   or --vram 3.2 --ram 5 [--offload]
  python device.py lock                       GPU lock file status
"""
import contextlib
import ctypes
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_py import T, env, lang, rename_kwargs  # noqa: E402

GB = 1024 ** 3
_HERE = os.path.dirname(os.path.abspath(__file__))


def _log(s):
    sys.stderr.write(s + "\n")
    sys.stderr.flush()


def fmt_num(x, d=1):
    """Number for messages: 3.2 (English) or 3,2 (Indonesian)."""
    s = f"{x:.{d}f}"
    return s.replace(".", ",") if lang() == "id" else s


# ------------------------------------------------------------------ hardware requirements table

_TABLE = None

# old keys of hardware-requirements.json (kebutuhan.json) -> new keys
_OLD_KEYS = {"_ket": "_desc", "tunggu_gpu_detik": "gpu_wait_seconds", "tugas": "tasks", "rekomendasi": "recommendation",
             "suara": "voice", "gambar": "image", "rtf_cpu_bawaan": "rtf_cpu_default", "rtf_cuda_bawaan": "rtf_cuda_default",
             "rtf_lemah": "rtf_weak", "ram_kosong_min_gb": "free_ram_min_gb", "vram_penuh_gb": "vram_full_gb",
             "ram_per_pekerja_gb": "ram_per_worker_gb", "thread_per_pekerja": "threads_per_worker", "pekerja_maks": "workers_max",
             "pekerja_berbagi": "workers_shared", "ram_pratinjau_skala_gb": "ram_preview_scale_gb"}


def _new_keys(d, top=True):
    if not isinstance(d, dict):
        return d
    out = {}
    for k, v in d.items():
        # task ids (chatterbox, whisper-small, ...) are not renamed; only known old keys are
        nk = _OLD_KEYS.get(k, k)
        out.setdefault(nk, _new_keys(v, False))
    return out


def table():
    """Contents of hardware-requirements.json (single table of thresholds / memory estimates; old keys accepted)."""
    global _TABLE
    if _TABLE is None:
        d = None
        for name in ("hardware-requirements.json", "kebutuhan.json"):
            try:
                with open(os.path.join(_HERE, name), encoding="utf-8") as f:
                    d = json.load(f)
                break
            except Exception:
                continue
        _TABLE = _new_keys(d) if d else {"margin_gb": 0.5, "gpu_wait_seconds": 120, "tasks": {}, "recommendation": {}}
    return _TABLE


def hardware_requirements(task):
    """Memory estimate of one task row (vram_gb, ram_gb, offload, ...)."""
    return dict(table().get("tasks", {}).get(task, {}))


def _gpu_wait_default():
    return float(env("MGP_GPU_WAIT", table().get("gpu_wait_seconds", 120)))


# ------------------------------------------------------------------ probe

def _run(cmd, timeout=8):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None


def ram():
    """(total_gb, free_gb). Free = available physical memory (not swap)."""
    try:
        import psutil
        v = psutil.virtual_memory()
        return v.total / GB, v.available / GB
    except Exception:
        pass
    try:
        if os.name == "nt":
            class MS(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            m = MS()
            m.dwLength = ctypes.sizeof(MS)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):
                return m.ullTotalPhys / GB, m.ullAvailPhys / GB
        if os.path.exists("/proc/meminfo"):
            d = {}
            for ln in open("/proc/meminfo"):
                k, v = ln.split(":", 1)
                d[k] = int(v.split()[0]) * 1024
            return d.get("MemTotal", 0) / GB, d.get("MemAvailable", d.get("MemFree", 0)) / GB
        if sys.platform == "darwin":
            tot = int((_run(["sysctl", "-n", "hw.memsize"]) or "0").strip() or 0)
            vm = _run(["vm_stat"]) or ""
            page = 4096
            free = 0
            for ln in vm.splitlines():
                if "page size of" in ln:
                    page = int("".join(c for c in ln.split("page size of")[1] if c.isdigit()) or 4096)
                if ln.startswith(("Pages free", "Pages inactive", "Pages speculative")):
                    free += int(ln.split(":")[1].strip().rstrip("."))
            return tot / GB, free * page / GB
    except Exception:
        pass
    return 0.0, 0.0


def cpu():
    name = platform.processor() or ""
    if os.name == "nt":
        try:
            import winreg
            k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            name = winreg.QueryValueEx(k, "ProcessorNameString")[0].strip()
        except Exception:
            pass
    elif sys.platform == "darwin":
        name = (_run(["sysctl", "-n", "machdep.cpu.brand_string"]) or name).strip()
    elif os.path.exists("/proc/cpuinfo"):
        for ln in open("/proc/cpuinfo"):
            if ln.startswith("model name"):
                name = ln.split(":", 1)[1].strip()
                break
    return {"name": name, "threads": os.cpu_count() or 1, "arch": platform.machine()}


def _vendor(name):
    n = name.lower()
    if "nvidia" in n or "geforce" in n or "quadro" in n or "rtx" in n:
        return "NVIDIA"
    if "amd" in n or "radeon" in n:
        return "AMD"
    if "intel" in n or "arc" in n or "iris" in n or "uhd" in n:
        return "Intel"
    if "apple" in n:
        return "Apple"
    return "other"


def gpu_nvidia():
    """NVIDIA GPUs from nvidia-smi (without creating a CUDA context)."""
    exe = shutil.which("nvidia-smi")
    if not exe and os.name == "nt":
        c = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "nvidia-smi.exe")
        exe = c if os.path.exists(c) else None
    if not exe:
        return []
    out = _run([exe, "--query-gpu=index,name,memory.total,memory.free,driver_version", "--format=csv,noheader,nounits"])
    result = []
    for ln in (out or "").strip().splitlines():
        p = [x.strip() for x in ln.split(",")]
        if len(p) < 5:
            continue
        try:
            result.append({"vendor": "NVIDIA", "name": p[1], "index": int(p[0]), "vramTotalGb": round(float(p[2]) / 1024, 2),
                           "vramFreeGb": round(float(p[3]) / 1024, 2), "driver": p[4], "source": "nvidia-smi"})
        except ValueError:
            pass
    return result


def gpu_other():
    """Non-NVIDIA GPUs (name only; iGPU VRAM = shared RAM)."""
    result = []
    if os.name == "nt":
        out = _run(["powershell", "-NoProfile", "-Command",
                    "Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }"], timeout=15)
        for n in (out or "").strip().splitlines():
            n = n.strip()
            if n and _vendor(n) != "NVIDIA":
                result.append({"vendor": _vendor(n), "name": n, "source": "wmi"})
    elif sys.platform == "darwin":
        out = _run(["system_profiler", "SPDisplaysDataType"], timeout=15) or ""
        for ln in out.splitlines():
            if "Chipset Model:" in ln:
                n = ln.split(":", 1)[1].strip()
                result.append({"vendor": _vendor(n) if _vendor(n) != "other" else "Apple", "name": n, "source": "system_profiler"})
    elif shutil.which("lspci"):
        for ln in (_run(["lspci"]) or "").splitlines():
            if "VGA" in ln or "3D controller" in ln or "Display" in ln:
                n = ln.split(":", 2)[-1].strip()
                if _vendor(n) != "NVIDIA":
                    result.append({"vendor": _vendor(n), "name": n, "source": "lspci"})
    return result


def torch_info(load=True):
    """PyTorch build in this Python: version, cuda/mps, VRAM per torch. None when torch is missing."""
    import importlib.util
    if importlib.util.find_spec("torch") is None:
        return None
    if not load and "torch" not in sys.modules:
        return {"version": None}
    try:
        import torch
        r = {"version": torch.__version__, "cudaBuild": torch.version.cuda, "cuda": bool(torch.cuda.is_available()),
             "mps": bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())}
        if r["cuda"]:
            r["cudnn"] = torch.backends.cudnn.version()
            r["gpu"] = torch.cuda.get_device_name(0)
            r["bf16"] = bool(torch.cuda.is_bf16_supported())
        r["build"] = "cuda" if r["cudaBuild"] else ("mps" if r["mps"] else "cpu")
        return r
    except Exception as e:
        return {"version": None, "error": str(e)[:200]}


def free_vram(index=0):
    """(free_gb, total_gb) of a CUDA GPU: nvidia-smi first (it does not create a CUDA context of ~0.5 GB that would
    lower the free number), then torch.cuda.mem_get_info when nvidia-smi is missing."""
    for g in gpu_nvidia():
        if g["index"] == index:
            return g["vramFreeGb"], g["vramTotalGb"]
    t = sys.modules.get("torch")
    if t is not None:
        try:
            if t.cuda.is_available():
                f, tot = t.cuda.mem_get_info(index)
                return f / GB, tot / GB
        except Exception:
            pass
    return 0.0, 0.0


@rename_kwargs({"torch_juga": "with_torch"})
def probe(with_torch=True):
    tot, free = ram()
    nv = gpu_nvidia()
    p = {"os": f"{platform.system()} {platform.release()}", "cpu": cpu(),
         "ram": {"totalGb": round(tot, 2), "freeGb": round(free, 2)},
         "gpu": nv + gpu_other(), "python": sys.version.split()[0], "python_exe": sys.executable}
    if sys.platform == "darwin" and platform.machine() == "arm64" and not any(g["vendor"] == "Apple" for g in p["gpu"]):
        p["gpu"].append({"vendor": "Apple", "name": "Apple Silicon (unified memory)", "source": "platform"})
    p["torch"] = torch_info() if with_torch else None
    p["lock"] = GpuLock().status()
    return p


# ------------------------------------------------------------------ decision

class Decision:
    """device: 'cuda' | 'cuda+offload' | 'mps' | 'cpu'. torch: device string for PyTorch."""

    @rename_kwargs({"perangkat": "device", "alasan": "reason", "vram_kosong": "free_vram", "ram_kosong": "free_ram", "dipaksa": "forced"})
    def __init__(self, device, reason, free_vram=None, free_ram=None, forced=False):
        self.device, self.reason, self.forced = device, reason, forced
        self.free_vram, self.free_ram = free_vram, free_ram
        self.fallback = None  # set when falling back to CPU because of OOM / a busy GPU

    @property
    def torch(self):
        return "cuda" if self.device.startswith("cuda") else self.device

    @property
    def gpu(self):
        return self.device != "cpu"

    def text(self):
        name = {"cuda": "GPU (CUDA)", "cuda+offload": T("GPU + RAM offload"), "mps": "GPU (MPS)", "cpu": "CPU"}[self.device]
        return f"{name}: {self.reason}"

    def dict(self):
        return {"device": self.device, "reason": self.reason, "forced": self.forced, "fallback": self.fallback,
                "vramFreeGb": None if self.free_vram is None else round(self.free_vram, 2),
                "ramFreeGb": None if self.free_ram is None else round(self.free_ram, 2)}

    def __repr__(self):
        return f"Decision({self.device!r}, {self.reason!r})"

    # old attribute / method names (perangkat.Keputusan)
    teks = text
    perangkat = property(lambda s: s.device, lambda s, v: setattr(s, "device", v))
    alasan = property(lambda s: s.reason, lambda s, v: setattr(s, "reason", v))
    dipaksa = property(lambda s: s.forced, lambda s, v: setattr(s, "forced", v))
    cadangan = property(lambda s: s.fallback, lambda s, v: setattr(s, "fallback", v))
    vram_kosong = property(lambda s: s.free_vram, lambda s, v: setattr(s, "free_vram", v))
    ram_kosong = property(lambda s: s.free_ram, lambda s, v: setattr(s, "free_ram", v))


def _cuda_usable(backend):
    """(usable, reason_when_not). backend: 'torch' | 'ctranslate2' | 'cpu' (small task, CPU only) | None (nvidia-smi is enough)."""
    if backend == "cpu":
        return False, T("small task, CPU is enough")
    if backend == "torch":
        import importlib.util
        if importlib.util.find_spec("torch") is None:
            return False, T("PyTorch is not installed")
        import torch
        if not torch.version.cuda:
            if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                return False, "mps"
            return False, T("PyTorch CPU build ({}); install a CUDA build to use the GPU", torch.__version__)
        if not torch.cuda.is_available():
            return False, T("PyTorch {} finds no CUDA GPU (driver?)", torch.__version__)
        return True, ""
    if backend == "ctranslate2":
        try:
            prepare_cuda_dll()
            import ctranslate2
            if ctranslate2.get_cuda_device_count() > 0:
                return True, ""
            return False, T("ctranslate2 finds no CUDA GPU")
        except Exception as e:
            return False, T("ctranslate2 without CUDA ({})", str(e)[:80])
    return (True, "") if gpu_nvidia() else (False, T("no NVIDIA GPU"))


@rename_kwargs({"tugas": "task"})
def decide(vram=0.0, ram_gb=0.0, offload=False, vram_min_offload=None, ram_offload=None,
           task=None, backend="torch", margin=None):
    """Pick the device for one task.

    vram: GB of VRAM needed with the whole model on the GPU. ram_gb: GB of RAM when running on the CPU.
    offload: the model supports offloading to RAM (diffusers style). vram_min_offload / ram_offload: needs of offload mode.
    task: row name in hardware-requirements.json (fills the numbers not given).
    """
    if task:
        k = hardware_requirements(task)
        vram = vram or k.get("vram_gb", 0.0)
        ram_gb = ram_gb or k.get("ram_gb", 0.0)
        offload = offload or k.get("offload", False)
        vram_min_offload = vram_min_offload or k.get("vram_min_offload_gb")
        ram_offload = ram_offload or k.get("ram_offload_gb")
    m = table().get("margin_gb", 0.5) if margin is None else margin
    _, rk = ram()
    forced = (env("MGP_DEVICE", "auto") or "auto").strip().lower() or "auto"
    if forced in ("cpu", "cuda", "mps", "cuda+offload"):
        vk = free_vram()[0] if forced.startswith("cuda") else None
        return Decision(forced, T("forced by MGP_DEVICE={}", forced), vk, rk, forced=True)

    ok, why = _cuda_usable(backend)
    if not ok:
        if why == "mps":
            return Decision("mps", "Apple GPU (MPS)", None, rk)
        return Decision("cpu", why + _ram_note(rk, ram_gb, m), None, rk)
    vk, vt = free_vram()
    n = fmt_num
    if vk - m >= vram:
        return Decision("cuda", T("free VRAM {} GB of {} GB, needs {} GB", n(vk), n(vt), n(vram)), vk, rk)
    if offload:
        vmin = vram_min_offload if vram_min_offload is not None else min(vram, 2.0)
        rof = ram_offload if ram_offload is not None else ram_gb
        if vk - m >= vmin and rk - m >= rof:
            return Decision("cuda+offload", T("free VRAM {} GB < needed {} GB; offload to RAM (free {} GB, needs {} GB)", n(vk), n(vram), n(rk), n(rof)), vk, rk)
        if vk - m >= vmin:
            return Decision("cpu", T("free VRAM {} GB, needs {} GB; not enough RAM for offload either (free {} GB, needs {} GB)", n(vk), n(vram), n(rk), n(rof)), vk, rk)
    return Decision("cpu", T("free VRAM {} GB, needs {} GB (+ margin {} GB)", n(vk), n(vram), n(m)) + _ram_note(rk, ram_gb, m), vk, rk)


def _ram_note(rk, need, m):
    if need and rk - m < need:
        return T("; warning: free RAM {} GB, needs ~{} GB (may be slow/swap)", fmt_num(rk), fmt_num(need))
    return ""


# ------------------------------------------------------------------ GPU lock across processes

def lock_path():
    e = env("MGP_GPU_LOCK")
    if e:
        return e
    # folder name "rekam" kept on purpose: old and new tool versions must share one GPU queue
    if os.name == "nt":
        root = os.environ.get("LOCALAPPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Local")
        return os.path.join(root, "rekam", "gpu.lock")
    root = os.environ.get("XDG_CACHE_HOME") or os.path.join(os.path.expanduser("~"), ".cache")
    return os.path.join(root, "rekam", "gpu.lock")


def pid_alive(pid):
    if not pid or pid <= 0:
        return False
    if os.name == "nt":
        k32 = ctypes.windll.kernel32
        h = k32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return k32.GetLastError() == 5  # access denied = the process exists
        try:
            code = ctypes.c_ulong()
            if not k32.GetExitCodeProcess(h, ctypes.byref(code)):
                return True
            return code.value == 259  # STILL_ACTIVE
        finally:
            k32.CloseHandle(h)
    try:
        os.kill(int(pid), 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return False


def _lock_keys(d):
    """Lock file content with the new keys (old writers used tugas/mulai/bahasa/rusak)."""
    if not isinstance(d, dict):
        return d
    for old, new in (("tugas", "task"), ("mulai", "start"), ("bahasa", "lang"), ("rusak", "corrupt")):
        if old in d:
            d.setdefault(new, d.pop(old))
    return d


class GpuLock:
    """One GPU job at a time, across processes. File content: JSON {pid, task, start, host, lang}."""

    def __init__(self, path=None):
        self.path = path or lock_path()
        self.held = 0

    def read(self):
        try:
            with open(self.path, encoding="utf-8") as f:
                return _lock_keys(json.load(f))
        except FileNotFoundError:
            return None
        except Exception:
            return {"pid": -1, "task": "?", "start": 0, "corrupt": True}

    def status(self):
        d = self.read()
        if d is None:
            return {"free": True, "file": self.path}
        alive = d.get("host", socket.gethostname()) != socket.gethostname() or pid_alive(d.get("pid"))
        return {"free": not alive, "stale": not alive, "file": self.path, **d}

    def _drop_stale(self):
        d = self.read()
        if d is None:
            return True
        if d.get("pid") == os.getpid():
            return False
        if not d.get("corrupt") and (d.get("host", socket.gethostname()) != socket.gethostname() or pid_alive(d.get("pid"))):
            return False
        # move it first (atomic) so two waiters do not delete each other's new lock
        tmp = f"{self.path}.stale.{os.getpid()}"
        try:
            os.replace(self.path, tmp)
            os.remove(tmp)
            _log("  " + T("stale GPU lock removed (PID {} '{}' is no longer running)", d.get("pid"), d.get("task")))
        except OSError:
            pass
        return True

    @rename_kwargs({"tugas": "task"})
    def try_acquire(self, task):
        """Take the lock without waiting. True when it worked (or this process already holds it)."""
        if self.held:
            self.held += 1
            return True
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        for _ in range(2):
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            except FileExistsError:
                d = self.read()
                if d and d.get("pid") == os.getpid():
                    self.held = 1
                    return True
                if not self._drop_stale():
                    return False
                continue
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump({"pid": os.getpid(), "task": task, "start": round(time.time(), 1), "host": socket.gethostname(),
                           "lang": "python"}, f)
            self.held = 1
            return True
        return False

    @rename_kwargs({"tugas": "task", "tunggu": "wait", "diam": "quiet"})
    def acquire(self, task, wait=None, quiet=False):
        """Wait up to `wait` seconds. True when the lock was taken."""
        if wait is None:
            wait = _gpu_wait_default()
        t0 = time.time()
        reported = False
        while True:
            if self.try_acquire(task):
                if reported and not quiet:
                    _log("  " + T("GPU free after {} s", f"{time.time() - t0:.0f}"))
                return True
            if time.time() - t0 >= wait:
                return False
            if not reported and not quiet:
                d = self.read() or {}
                since = time.strftime("%H:%M:%S", time.localtime(d.get("start", time.time())))
                _log("  " + T("GPU is in use by '{}' (PID {}, since {}); waiting up to {} s...", d.get("task", "?"), d.get("pid"), since, f"{wait:.0f}"))
                reported = True
            time.sleep(min(2.0, max(0.1, wait - (time.time() - t0))))

    def release(self):
        if not self.held:
            return
        self.held -= 1
        if self.held:
            return
        d = self.read()
        if d and d.get("pid") == os.getpid():
            try:
                os.remove(self.path)
            except OSError:
                pass

    # old names (perangkat.KunciGPU)
    baca = read
    coba = try_acquire
    ambil = acquire
    lepas = release
    _buang_basi = _drop_stale
    dipegang = property(lambda s: s.held, lambda s, v: setattr(s, "held", v))


_LOCK = None


def lock():
    """The process-wide GpuLock (released at exit)."""
    global _LOCK
    if _LOCK is None:
        import atexit
        _LOCK = GpuLock()

        def _at_exit():
            if _LOCK.held:
                _LOCK.held = 1
                _LOCK.release()
        atexit.register(_at_exit)
    return _LOCK


# ------------------------------------------------------------------ usage

def _test_limit(k):
    """MGP_GPU_LIMIT=<GB>: limit CUDA allocations of this process (OOM tests only)."""
    b = env("MGP_GPU_LIMIT")
    if not b or not k.torch == "cuda":
        return
    try:
        import torch
        tot = torch.cuda.get_device_properties(0).total_memory / GB
        torch.cuda.set_per_process_memory_fraction(max(0.01, min(1.0, float(b) / tot)), 0)
        _log("  " + T("[test] CUDA memory limited to {} GB (MGP_GPU_LIMIT)", fmt_num(float(b))))
    except Exception as e:
        _log("  " + T("[test] MGP_GPU_LIMIT could not be applied: {}", e))


@contextlib.contextmanager
@rename_kwargs({"nama": "name", "tunggu": "wait", "diam": "quiet"})
def use_gpu(name, wait=None, quiet=False, **kw):
    """decide(**kw) then, on a GPU, take the lock (waiting). No lock -> CPU.
    Yields a Decision; the lock is released when the block ends."""
    k = decide(**kw)
    held = False
    if k.device.startswith("cuda"):
        kc = lock()
        if kc.acquire(name, wait=wait, quiet=quiet):
            held = True
            if not k.forced:  # check memory again after the previous holder finished
                k2 = decide(**kw)
                if not k2.device.startswith("cuda"):
                    kc.release()
                    held = False
                k = k2
        else:
            t = wait if wait is not None else _gpu_wait_default()
            d = kc.read() or {}
            k = Decision("cpu", T("GPU still in use by '{}' (PID {}) after waiting {} s", d.get("task", "?"), d.get("pid"), f"{t:.0f}"), k.free_vram, k.free_ram)
            k.fallback = "gpu-busy"
    if not quiet:
        _log(T("device [{}]: {}", name, k.text()))
    _test_limit(k)
    try:
        yield k
    finally:
        if held:
            empty_cuda()
            lock().release()


def is_oom(e):
    s = f"{type(e).__name__}: {e}".lower()
    return ("outofmemory" in s or "out of memory" in s or "cublas_status_alloc_failed" in s
            or "cudnn_status_alloc_failed" in s or "cuda_error_out_of_memory" in s)


def empty_cuda():
    t = sys.modules.get("torch")
    if t is None:
        return
    try:
        import gc
        gc.collect()
        if t.cuda.is_available():
            t.cuda.empty_cache()
    except Exception:
        pass


def cuda_library_error(e):
    """GPU errors that are not OOM but still worth retrying on the CPU (missing cuBLAS/cuDNN DLL, driver, ...)."""
    s = str(e).lower()
    return any(x in s for x in ("cublas", "cudnn", "cuda driver", "no cuda gpus", "cuda error", "nvcuda")) and \
        any(x in s for x in ("not found", "cannot be loaded", "could not load", "is not found", "failed", "error", "unavailable"))


@rename_kwargs({"nama": "name", "fungsi": "fn", "saat_turun": "on_fallback", "tunggu": "wait", "diam": "quiet", "turun_bila": "fallback_if"})
def run(name, fn, on_fallback=None, wait=None, quiet=False, fallback_if=None, **kw):
    """Run fn(k) on the chosen device. On CUDA OOM (or when fallback_if(e) is true): release the GPU,
    call on_fallback() (drop cached models), then retry fn(k_cpu).
    Returns (result, decision)."""
    with use_gpu(name, wait=wait, quiet=quiet, **kw) as k:
        if not k.gpu:
            return fn(k), k
        try:
            return fn(k), k
        except Exception as e:
            oom = is_oom(e)
            if not oom and not (fallback_if and fallback_if(e)):
                raise
            before = k.text()
            cause = T("CUDA out of memory") if oom else T("GPU failed")
            _log(T("device [{}]: {} ({}); GPU released, retrying on the CPU", name, cause, (str(e).splitlines() or [''])[0][:160]))
    # outside the block: the lock is already released
    if on_fallback:
        on_fallback()
    empty_cuda()
    k = Decision("cpu", T("fallback after {} (was {})", cause, before))
    k.fallback = "oom" if oom else "gpu-error"
    if not quiet:
        _log(T("device [{}]: {}", name, k.text()))
    return fn(k), k


# ------------------------------------------------------------------ CUDA DLL helper (Windows)

_DLL = False


def prepare_cuda_dll():
    """On Windows, ctranslate2 (faster-whisper) needs cuBLAS/cuDNN; use the DLLs shipped with the PyTorch CUDA wheel."""
    global _DLL
    if _DLL or os.name != "nt":
        return
    _DLL = True
    try:
        import importlib.util
        s = importlib.util.find_spec("torch")
        if s and s.origin:
            lib = os.path.join(os.path.dirname(s.origin), "lib")
            if os.path.exists(os.path.join(lib, "cublas64_12.dll")):
                os.add_dll_directory(lib)
                os.environ["PATH"] = lib + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass


# ------------------------------------------------------------------ stored measurements (used by `mgp doctor`)


def model_whisper(name):
    """Local faster-whisper folder from `mgp install voice` (env MGP_WHISPER_CACHE = Hugging Face cache),
    so nothing is downloaded again. Other names / explicit folders are returned as they are."""
    import glob
    c = env("MGP_WHISPER_CACHE")
    if c and not os.path.isdir(name):
        for d in sorted(glob.glob(os.path.join(c, f"models--Systran--faster-whisper-{name}", "snapshots", "*"))):
            if os.path.exists(os.path.join(d, "model.bin")):
                return d
    return name


def measurements_file():
    # file name ukur.json kept (shared with older tool versions)
    return os.path.join(os.path.dirname(lock_path()), "ukur.json")


@rename_kwargs({"kunci_ukur": "key", "nilai": "value"})
def record_measurement(key, value):
    """Store the latest measurement (e.g. voice RTF per device) so `mgp doctor` uses this machine's numbers."""
    f = measurements_file()
    try:
        os.makedirs(os.path.dirname(f), exist_ok=True)
        d = {}
        if os.path.exists(f):
            with open(f, encoding="utf-8") as h:
                d = json.load(h)
        d[key] = {**(value if isinstance(value, dict) else {"value": value}), "time": time.strftime("%Y-%m-%d %H:%M")}
        with open(f, "w", encoding="utf-8") as h:
            json.dump(d, h, ensure_ascii=False, indent=1)
    except Exception:
        pass


# ------------------------------------------------------------------ old names (perangkat.py), kept as aliases

angka = fmt_num
tabel = table
kebutuhan = hardware_requirements
_jalan = _run
gpu_lain = gpu_other
info_torch = torch_info
vram_kosong = free_vram
Keputusan = Decision
_cuda_bisa = _cuda_usable
putuskan = decide
_ram_catatan = _ram_note
lokasi_kunci = lock_path
pid_hidup = pid_alive
KunciGPU = GpuLock
kunci = lock
_batas_uji = _test_limit
pakai_gpu = use_gpu
adalah_oom = is_oom
kosongkan_cuda = empty_cuda
galat_pustaka_cuda = cuda_library_error
jalankan = run
siapkan_dll_cuda = prepare_cuda_dll
berkas_ukur = measurements_file
catat_ukur = record_measurement


# ------------------------------------------------------------------ CLI

def main():
    import argparse
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=T("mgp device manager"))
    cmds = {"profile": "profile", "decide": "decide", "lock": "lock", "profil": "profile", "putuskan": "decide", "kunci": "lock"}
    ap.add_argument("command", choices=list(cmds), metavar="{profile,decide,lock}")
    ap.add_argument("--task", "--tugas", dest="task")
    ap.add_argument("--vram", type=float, default=0.0)
    ap.add_argument("--ram", type=float, default=0.0)
    ap.add_argument("--offload", action="store_true")
    ap.add_argument("--backend", default="torch")
    ap.add_argument("--no-torch", "--tanpa-torch", dest="no_torch", action="store_true")
    ap.add_argument("--only-torch", "--hanya-torch", dest="only_torch", action="store_true",
                    help=T("profile: PyTorch build + lock only (used by mgp doctor)"))
    a = ap.parse_args()
    cmd = cmds[a.command]
    if cmd == "profile" and a.only_torch:
        prepare_cuda_dll()
        ct = None
        try:
            import ctranslate2
            ct = {"version": ctranslate2.__version__, "cuda": ctranslate2.get_cuda_device_count()}
        except Exception:
            pass
        print(json.dumps({"python": sys.version.split()[0], "python_exe": sys.executable, "torch": torch_info(),
                          "ctranslate2": ct, "lock": GpuLock().status()}, ensure_ascii=False))
    elif cmd == "profile":
        print(json.dumps(probe(with_torch=not a.no_torch), ensure_ascii=False))
    elif cmd == "decide":
        print(json.dumps(decide(a.vram, a.ram, a.offload, task=a.task, backend=a.backend).dict(), ensure_ascii=False))
    else:
        print(json.dumps(GpuLock().status(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
