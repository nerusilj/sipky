"""Oprava technického názvu DEB; datový archiv zůstává beze změny."""
import io
import os
from pathlib import Path
import re
import sys
import tarfile


def fix(path):
    path = Path(path)
    temporary = path.with_suffix('.deb.tmp')
    changed = False
    with path.open('rb') as source, temporary.open('xb') as target:
        magic = source.read(8)
        if magic != b'!<arch>\n':
            raise ValueError('Neplatný DEB archiv.')
        target.write(magic)
        while header := source.read(60):
            if len(header) != 60 or header[-2:] != b'`\n':
                raise ValueError('Poškozený ar archiv.')
            name = header[:16].decode('ascii').strip().rstrip('/')
            size = int(header[48:58])
            if name.startswith('control.tar'):
                data = source.read(size)
                result = io.BytesIO()
                mode = {'control.tar.gz': 'w:gz', 'control.tar.xz': 'w:xz', 'control.tar': 'w:'}[name]
                with tarfile.open(fileobj=io.BytesIO(data), mode='r:*') as original, tarfile.open(fileobj=result, mode=mode) as patched:
                    for entry in original:
                        content = original.extractfile(entry).read() if entry.isfile() else None
                        if entry.name.removeprefix('./') == 'control':
                            content, count = re.subn(rb'^Package:[^\r\n]*', b'Package: sipky', content, flags=re.MULTILINE)
                            if count != 1:
                                raise ValueError('Chybí jednoznačná položka Package.')
                            entry.size = len(content)
                            changed = True
                        patched.addfile(entry, io.BytesIO(content) if content is not None else None)
                data = result.getvalue()
                target.write(header[:48] + str(len(data)).encode('ascii').ljust(10) + header[58:])
                target.write(data)
                if len(data) % 2:
                    target.write(b'\n')
            else:
                target.write(header)
                remaining = size
                while remaining:
                    chunk = source.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError('Neúplný archiv.')
                    target.write(chunk)
                    remaining -= len(chunk)
                if size % 2:
                    target.write(b'\n')
            if size % 2:
                source.read(1)
    if not changed:
        raise ValueError('Chybí Debian control.')
    os.replace(temporary, path)
    print('DEB: Package: sipky; datový obsah nezměněn.')


if __name__ == '__main__':
    fix(sys.argv[1])
