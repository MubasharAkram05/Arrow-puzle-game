"""
Check the compiled AndroidManifest of an APK (the output of `aapt2 dump xmltree --file AndroidManifest.xml app.apk`,
read from stdin). Android 12+ refuses to install an APK when:
  - an <activity>, <activity-alias>, <service> or <receiver> with an <intent-filter> has no android:exported
  - android:testOnly is true (only `adb install -t` installs it)
Prints every component and exits 1 on any problem.
"""
import re
import sys

COMPONENTS = {"activity", "activity-alias", "service", "receiver"}
NS = "http://schemas.android.com/apk/res/android:"


def parse(lines):
    """Turn the indented xmltree dump into nested {tag, attrs, children} nodes."""
    root = {"tag": "#root", "attrs": {}, "children": [], "indent": -1}
    stack = [root]
    for line in lines:
        m = re.match(r"^(\s*)(E|A): (.*)$", line)
        if not m:
            continue
        indent, kind, rest = len(m.group(1)), m.group(2), m.group(3)
        if kind == "E":
            node = {"tag": rest.split(" ")[0], "attrs": {}, "children": [], "indent": indent}
            while stack[-1]["indent"] >= indent:
                stack.pop()
            stack[-1]["children"].append(node)
            stack.append(node)
        else:
            while stack[-1]["indent"] >= indent:
                stack.pop()
            am = re.match(r"^([^=(]+)(?:\([^)]*\))?=(.*)$", rest)
            if am:
                name = am.group(1).replace(NS, "android:")
                value = am.group(2).split(" (Raw:")[0].strip().strip('"')
                stack[-1]["attrs"][name] = value
    return root


def walk(node):
    yield node
    for c in node["children"]:
        yield from walk(c)


def main():
    root = parse(sys.stdin.read().splitlines())
    problems = []
    nodes = list(walk(root))
    for n in nodes:
        if n["tag"] == "application" and n["attrs"].get("android:testOnly") in ("true", "0xffffffff", "-1"):
            problems.append("application has android:testOnly=true")
    for n in nodes:
        if n["tag"] not in COMPONENTS:
            continue
        name = n["attrs"].get("android:name", "?")
        has_filter = any(c["tag"] == "intent-filter" for c in n["children"])
        exported = n["attrs"].get("android:exported")
        print(f"  {n['tag']:<15} exported={exported or '-':<12} intent-filter={'yes' if has_filter else 'no ':<3} {name}")
        if has_filter and exported is None:
            problems.append(f"{n['tag']} {name} has an intent-filter but no android:exported")
    if not any(n["tag"] == "application" for n in nodes):
        problems.append("no <application> found (not a valid manifest dump)")
    for p in problems:
        print(f"::error::{p}")
    print("manifest: OK" if not problems else f"manifest: {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
