"""Start het spel "Pesten" buiten Jupyter (bijvoorbeeld in Docker).

Alle code staat in pesten_spel.ipynb. Dit script voert de codecellen van
dat notebook achter elkaar uit, zodat je maar op één plek code hoeft aan te
passen. Overgeslagen worden:
- cellen die beginnen met  # %%ALLEEN-NOTEBOOK%%  (installeren, testcellen)
- regels die met % of ! beginnen (Jupyter-commando's zoals %pip)

Gebruik:  python start_pesten.py
"""
import json
from pathlib import Path

NOTEBOOK = Path(__file__).with_name("pesten_spel.ipynb")
MARKERING = "%%ALLEEN-NOTEBOOK%%"


def code_uit_notebook(pad: Path) -> str:
    notebook = json.loads(pad.read_text(encoding="utf-8"))
    delen = []
    for cel in notebook["cells"]:
        if cel["cell_type"] != "code":
            continue
        bron = "".join(cel["source"])
        if MARKERING in bron.split("\n", 1)[0]:
            continue
        regels = [r for r in bron.split("\n") if not r.startswith(("%", "!"))]
        delen.append("\n".join(regels))
    return "\n\n".join(delen)


if __name__ == "__main__":
    code = code_uit_notebook(NOTEBOOK)
    exec(compile(code, str(NOTEBOOK), "exec"),
         {"__name__": "__main__", "__file__": str(NOTEBOOK)})
