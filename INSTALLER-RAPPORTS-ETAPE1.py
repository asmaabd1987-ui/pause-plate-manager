from pathlib import Path
import re
import shutil
import sys

HERE = Path(__file__).resolve().parent
SOURCE_REPORTS = HERE / "reports-etape1.js"

def is_repo(path: Path) -> bool:
    return (
        path.is_dir()
        and (path / "index.html").is_file()
        and (path / "js" / "app.js").is_file()
    )

def candidates():
    home = Path.home()
    items = [
        Path.cwd(),
        HERE,
        HERE.parent,
        home / "pause-plate-github",
        home / "Desktop" / "pause-plate-github",
        home / "Documents" / "pause-plate-github",
        home / "Downloads" / "pause-plate-github",
        Path(r"D:\mine\pause-plate-github"),
    ]
    # Also check a few common direct children without doing a huge recursive search.
    for parent in [home / "Desktop", home / "Documents", home / "Downloads"]:
        if parent.is_dir():
            try:
                for child in parent.iterdir():
                    if child.is_dir() and "pause" in child.name.lower() and "plate" in child.name.lower():
                        items.append(child)
            except Exception:
                pass
    seen = set()
    for p in items:
        key = str(p)
        if key not in seen:
            seen.add(key)
            yield p

repo = None
for p in candidates():
    if is_repo(p):
        repo = p
        break

if repo is None:
    raw = input("Collez le chemin du dossier pause-plate-github puis Entrée : ").strip().strip('"')
    p = Path(raw).expanduser()
    if is_repo(p):
        repo = p

if repo is None:
    print("ERREUR : projet introuvable. Il faut le dossier contenant index.html et js/app.js.")
    input("Entrée pour fermer...")
    sys.exit(1)

if not SOURCE_REPORTS.is_file():
    print("ERREUR : reports-etape1.js doit rester dans le même dossier que cet installateur.")
    input("Entrée pour fermer...")
    sys.exit(1)

js_dir = repo / "js"
js_dir.mkdir(parents=True, exist_ok=True)
target_reports = js_dir / "reports.js"
shutil.copy2(SOURCE_REPORTS, target_reports)

index = repo / "index.html"
backup = repo / "index.html.before-reports-step1.bak"
if not backup.exists():
    shutil.copy2(index, backup)

html = index.read_text(encoding="utf-8")

if 'src="js/reports.js"' not in html and "src='js/reports.js'" not in html:
    # Prefer inserting immediately after the existing app.js tag.
    pattern = re.compile(
        r'(<script\b[^>]*\bsrc\s*=\s*["\']js/app\.js["\'][^>]*>\s*</script>)',
        re.IGNORECASE
    )
    if pattern.search(html):
        html = pattern.sub(r'\1\n<script src="js/reports.js"></script>', html, count=1)
    elif "</body>" in html.lower():
        pos = html.lower().rfind("</body>")
        html = html[:pos] + '    <script src="js/reports.js"></script>\n' + html[pos:]
    else:
        html += '\n<script src="js/reports.js"></script>\n'

    index.write_text(html, encoding="utf-8")

print("")
print("==============================================")
print(" PAUSE & PLATE — RAPPORTS ÉTAPE 1 : OK")
print("==============================================")
print("Projet :", repo)
print("Créé  :", target_reports)
print("Index  : js/reports.js chargé après js/app.js")
print("Backup :", backup)
print("")
print("Ouvrez ensuite la page Rapports.")
input("Entrée pour fermer...")
