"""Factor structure of the mood-space: PCA + varimax over the numeric
dimensions of the v1.0 dataset.

Finding + interpretation: .ai/knowledge/mood-space-factor-structure.md
Run: python scripts/mood-factors.py   (numpy only)
"""
import json
import os
import numpy as np

PATH = os.path.join(os.path.dirname(__file__), "..", "dataset",
                    "mooduel-v1.0.jsonl")

NUMERIC = ["valence", "arousal", "dominance", "absorption", "hedonic",
           "eudaimonic", "psych_rich", "comfort_level",
           "conversation_potential"]

rows, titles, extras = [], [], []
with open(PATH, encoding="utf-8") as f:
    for line in f:
        m = json.loads(line)
        vals = [m.get(k) for k in NUMERIC]
        if any(v is None or not isinstance(v, (int, float)) for v in vals):
            continue
        rows.append(vals)
        titles.append(m.get("title", "?"))
        extras.append({"ending": m.get("ending_type"),
                       "pacing": m.get("pacing")})

X = np.array(rows, dtype=float)
print(f"movies with complete numeric profiles: {len(X)}")

Z = (X - X.mean(0)) / X.std(0)
C = np.corrcoef(Z, rowvar=False)

print("\n=== correlation matrix (|r| >= 0.4 flagged) ===")
print("            " + " ".join(f"{k[:7]:>8}" for k in NUMERIC))
for i, k in enumerate(NUMERIC):
    cells = " ".join(
        f"{C[i, j]:+8.2f}" + ("*" if abs(C[i, j]) >= 0.4 and i != j else " ")
        for j in range(len(NUMERIC)))
    print(f"{k[:11]:<11} {cells}")

eigval, eigvec = np.linalg.eigh(C)
order = np.argsort(eigval)[::-1]
eigval, eigvec = eigval[order], eigvec[:, order]
expl = eigval / eigval.sum()
print("\n=== eigenvalues / explained variance ===")
for i, (ev, ex) in enumerate(zip(eigval, expl)):
    print(f"PC{i+1}: eigenvalue {ev:.2f}  {ex*100:5.1f}%  "
          f"cum {expl[:i+1].sum()*100:5.1f}%")

k = max(2, int((eigval > 1.0).sum()))
print(f"\nretained factors (Kaiser eigenvalue>1): {k}")
L = eigvec[:, :k] * np.sqrt(eigval[:k])


def varimax(Phi, gamma=1.0, q=100, tol=1e-6):
    p, kk = Phi.shape
    R = np.eye(kk)
    d = 0
    for _ in range(q):
        Lam = Phi @ R
        u, s, vt = np.linalg.svd(
            Phi.T @ (Lam ** 3 - (gamma / p) * Lam
                     @ np.diag(np.diag(Lam.T @ Lam))))
        R = u @ vt
        d_new = s.sum()
        if d_new < d * (1 + tol):
            break
        d = d_new
    return Phi @ R


Lr = varimax(L)
for j in range(k):
    if Lr[np.argmax(np.abs(Lr[:, j])), j] < 0:
        Lr[:, j] *= -1

print("\n=== varimax-rotated loadings (|loading| >= 0.45 flagged) ===")
print("            " + " ".join(f"{'F' + str(j + 1):>8}" for j in range(k)))
for i, name in enumerate(NUMERIC):
    cells = " ".join(
        f"{Lr[i, j]:+8.2f}" + ("*" if abs(Lr[i, j]) >= 0.45 else " ")
        for j in range(k))
    print(f"{name[:11]:<11} {cells}")

S = Z @ np.linalg.pinv(C) @ Lr

print("\n=== exemplars per factor (top 6 / bottom 6 by score) ===")
for j in range(k):
    idx = np.argsort(S[:, j])
    print(f"\nF{j+1} high: {', '.join(titles[i] for i in idx[-6:][::-1])}")
    print(f"F{j+1} low : {', '.join(titles[i] for i in idx[:6])}")

for field in ("ending", "pacing"):
    groups = {}
    for i, e in enumerate(extras):
        groups.setdefault(e[field], []).append(i)
    print(f"\n=== mean factor score by {field} ===")
    print("            " + " ".join(f"{'F' + str(j + 1):>7}"
                                    for j in range(k)) + "     n")
    for name, idxs in sorted(groups.items(), key=lambda kv: -len(kv[1]))[:8]:
        ms = S[idxs].mean(0)
        print(f"{str(name)[:11]:<11} "
              + " ".join(f"{v:+7.2f}" for v in ms) + f" {len(idxs):>6}")
