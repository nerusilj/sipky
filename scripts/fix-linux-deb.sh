#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PACKAGE=${1:-"$ROOT/outputs/linux/Šipky_0.1.0_amd64.deb"}
[ -f "$PACKAGE" ] || { echo 'Chybi DEB.'; exit 1; }
PACKAGE=$(realpath "$PACKAGE")
WORK=$(mktemp -d /var/tmp/darts-cz-deb.XXXXXX)
dpkg-deb --raw-extract "$PACKAGE" "$WORK/package"
sed -i 's/^Package:.*/Package: sipky/' "$WORK/package/DEBIAN/control"
dpkg --validate-pkgname sipky
dpkg-deb --root-owner-group --build "$WORK/package" "$WORK/fixed.deb"
[ "$(dpkg-deb --field "$WORK/fixed.deb" Package)" = sipky ] || exit 1
cp -- "$WORK/fixed.deb" "$PACKAGE"
echo 'DEB opraven: Package: sipky; viditelny nazev Sipky zustava.'
if [ "$PACKAGE" = "$ROOT/outputs/linux/Šipky_0.1.0_amd64.deb" ]; then
  (cd "$ROOT/outputs/linux"; sha256sum -- *.deb *.AppImage > SHA256SUMS.txt)
  bash "$ROOT/scripts/check-linux-build.sh"
fi
