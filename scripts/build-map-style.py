#!/usr/bin/env python3
"""Rebuild the branded basemap style from Carto's Dark Matter.

Dark Matter is ~96% achromatic: 64 distinct colours across 93 layers, almost
all of them neutral greys. That is what makes this tractable -- there is no
cartographic colour scheme to fight, only a greyscale ramp. So we keep every
colour's luminance, and swap its hue for the LeafyGreen slate ramp.

Carto's actual cartography -- layer order, zoom stops, label placement, line
widths, sprite references -- is left exactly as it is. Only colour changes.

Tiles, glyphs and sprites still come from Carto at runtime, so the OpenStreetMap
and Carto attribution continues to flow through their TileJSON. Vendoring the
style does not vendor the basemap, and the attribution requirement stands.

Usage:  python3 scripts/build-map-style.py
"""
import json
import re
import urllib.request

SOURCE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
OUTPUT = "public/brand/map/incident-slate.json"

# The LeafyGreen gray ramp, which is already cool/slate-tinted, anchored at
# Slate Blue -- the same colour as the app's page background.
RAMP = ["#001E2B", "#112733", "#21313C", "#3D4F58",
        "#5C6C75", "#889397", "#C1C7C6", "#E8EDEB"]

# Slate lifted with a touch of Evergreen. Water is the one place on the
# basemap where a green cast belongs; everywhere else it would compete with
# the incident markers.
WATER = "#10333A"


def parse(c):
    """-> (r, g, b, a) or None if this is not a literal colour."""
    c = c.strip()
    if c.startswith("#"):
        h = c[1:]
        if len(h) == 3:
            h = "".join(x * 2 for x in h)
        if len(h) not in (6, 8):
            return None
        v = [int(h[i:i + 2], 16) for i in range(0, len(h), 2)]
        return (v[0], v[1], v[2], v[3] / 255 if len(v) == 4 else 1.0)
    m = re.fullmatch(r"rgba?\(([^)]*)\)", c)
    if not m:
        return None
    p = [float(x) for x in m.group(1).replace("/", ",").split(",")]
    return (int(p[0]), int(p[1]), int(p[2]), p[3] if len(p) > 3 else 1.0)


def lum(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


RAMP_RGB = [parse(c) for c in RAMP]
RAMP_LUM = [lum(c) for c in RAMP_RGB]


def at_luminance(target):
    """Sample the ramp at a luminance, interpolating between stops."""
    if target <= RAMP_LUM[0]:
        return RAMP_RGB[0][:3]
    if target >= RAMP_LUM[-1]:
        return RAMP_RGB[-1][:3]
    for i in range(len(RAMP_LUM) - 1):
        lo, hi = RAMP_LUM[i], RAMP_LUM[i + 1]
        if lo <= target <= hi:
            t = (target - lo) / (hi - lo)
            a, b = RAMP_RGB[i], RAMP_RGB[i + 1]
            return tuple(round(a[j] + (b[j] - a[j]) * t) for j in range(3))
    return RAMP_RGB[-1][:3]


def css(rgb, alpha):
    if alpha >= 1.0:
        return "#%02x%02x%02x" % rgb
    return "rgba(%d, %d, %d, %g)" % (rgb[0], rgb[1], rgb[2], alpha)


def main():
    with urllib.request.urlopen(SOURCE) as r:
        style = json.load(r)

    # Carto's darkest ink sits below the slate ramp's floor, so stretch the
    # source range onto the ramp rather than clipping it -- otherwise the
    # background, land cover and road casings all collapse into one flat tone.
    lums = []

    def collect(node):
        if isinstance(node, str):
            c = parse(node)
            if c:
                lums.append(lum(c))
        elif isinstance(node, dict):
            for v in node.values():
                collect(v)
        elif isinstance(node, list):
            for v in node:
                collect(v)

    for layer in style["layers"]:
        collect(layer.get("paint") or {})
        collect(layer.get("layout") or {})
    src_lo, src_hi = min(lums), max(lums)
    dst_lo, dst_hi = RAMP_LUM[0], RAMP_LUM[-1] * 0.85

    def remap(node, key=None):
        if isinstance(node, str):
            c = parse(node)
            if not c:
                return node
            t = (lum(c) - src_lo) / (src_hi - src_lo)
            # Halos exist to separate label glyphs from the ground, so they
            # are the ground, not a value scaled off the original.
            if key == "text-halo-color":
                return css(RAMP_RGB[0][:3], c[3])
            return css(at_luminance(dst_lo + t * (dst_hi - dst_lo)), c[3])
        if isinstance(node, dict):
            return {k: remap(v, key) for k, v in node.items()}
        if isinstance(node, list):
            return [remap(v, key) for v in node]
        return node

    for layer in style["layers"]:
        for section in ("paint", "layout"):
            block = layer.get(section)
            if not block:
                continue
            layer[section] = {k: remap(v, k) for k, v in block.items()}

        # The map ground has to be the app ground exactly, or the canvas
        # reads as a different surface pasted into the page.
        if layer["id"] == "background":
            layer["paint"]["background-color"] = RAMP[0]
        elif layer["id"] == "water":
            layer["paint"]["fill-color"] = WATER

    style["name"] = "Incident Slate"
    style["metadata"] = {
        **(style.get("metadata") or {}),
        "incident:derived-from": SOURCE,
        "incident:generator": "scripts/build-map-style.py",
    }

    with open(OUTPUT, "w") as f:
        json.dump(style, f, separators=(",", ":"))
    print("wrote %s (%d layers, source luminance %.0f-%.0f)"
          % (OUTPUT, len(style["layers"]), src_lo, src_hi))


if __name__ == "__main__":
    main()
