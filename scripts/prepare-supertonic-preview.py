"""Stáhne pevnou archivní verzi Supertonic 3 pro lokální ukázky, bez účtu."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
MODEL_REV = "aafc6e32416a594460b32413efc49d7fe4ce6d46"
SOURCE_REV = "1e9799e964ea4c0dad7cde993b65c3c813a7b373"
REPO = "supertone-oss-archive/supertonic-3"
# Mimo zdrojové soubory i balíček aplikace.
ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = next((parent for parent in (ROOT, *ROOT.parents) if (parent / ".tools").is_dir()), ROOT)
DEST = WORKSPACE / ".tools" / "supertonic-3"


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "DartsCZ-local-preview"}), timeout=90)


def digest(path, git_blob=False):
    h = hashlib.sha1() if git_blob else hashlib.sha256()
    if git_blob:
        h.update(f"blob {path.stat().st_size}\0".encode())
    with path.open("rb") as source:
        for data in iter(lambda: source.read(1024 * 1024), b""):
            h.update(data)
    return h.hexdigest()


def download(item):
    relative = item["path"]
    path = DEST / "assets" / relative
    expected = item.get("lfs", {}).get("oid", item["oid"])
    git_blob = "lfs" not in item
    if path.is_file() and path.stat().st_size == item["size"] and digest(path, git_blob) == expected:
        print(f"Již staženo: {relative}", flush=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")
    with get(f"https://huggingface.co/{REPO}/resolve/{MODEL_REV}/{relative}") as response, tmp.open("wb") as target:
        for data in iter(lambda: response.read(1024 * 1024), b""):
            target.write(data)
    if tmp.stat().st_size != item["size"] or digest(tmp, git_blob) != expected:
        raise ValueError(f"Nesouhlasí velikost nebo kontrolní součet: {relative}")
    tmp.replace(path)
    print(f"Staženo a ověřeno: {relative} ({item['size'] / 1e6:.1f} MB)", flush=True)


def main():
    with get(f"https://huggingface.co/api/models/{REPO}/tree/{MODEL_REV}?recursive=true") as response:
        entries = json.load(response)
    selected = [item for item in entries if item["type"] == "file" and
                (item["path"].startswith(("onnx/", "voice_styles/")) or item["path"] in ("LICENSE", "README.md"))]
    print(f"Stažení {sum(item['size'] for item in selected) / 1e6:.1f} MB do {DEST}", flush=True)
    # Samostatné soubory; maximálně dvě spojení, výsledky všech úloh se kontrolují.
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(download, selected))
    for relative, destination in (("py/helper.py", "helper.py"), ("LICENSE", "SOURCE-LICENSE")):
        with get(f"https://raw.githubusercontent.com/supertone-oss-archive/supertonic/{SOURCE_REV}/{relative}") as response:
            (DEST / destination).write_bytes(response.read())
    (DEST / "provenance.json").write_text(json.dumps({
        "model_repository": REPO, "model_revision": MODEL_REV,
        "source_repository": "supertone-oss-archive/supertonic", "source_revision": SOURCE_REV,
        "helper_sha256": digest(DEST / "helper.py"),
        "model_license": "OpenRAIL-M", "source_license": "MIT",
    }, indent=2) + "\n", encoding="utf-8")
    print("Hotovo. Syntéza bude používat pouze místní soubory.", flush=True)


if __name__ == "__main__":
    main()
