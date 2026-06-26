#!/usr/bin/env python3
"""
Batch rewrite CMM-Math geometry problems into figure-drawing descriptions.
Run with: python3 scripts/rewrite.py
Requires: DEEPSEEK_API_KEY env var
"""
import json, os, urllib.request, sys, time

KEY = os.environ.get("DEEPSEEK_API_KEY", "")
if not KEY:
    sys.exit("Set DEEPSEEK_API_KEY environment variable")

API = "https://api.deepseek.com/v1/chat/completions"
MODEL = "deepseek-chat"

def rewrite_one(desc, subject):
    prompt = f"将以下数学题改写为作图指令。以「画」开头，去掉求解/证明要求。若无图形可画，回复 SKIP。\n学科：{subject}\n原题：{desc}"

    req = urllib.request.Request(API,
        data=json.dumps({"model": MODEL, "messages": [
            {"role":"system","content":"只输出改写后的一句话或SKIP，不解释。"},
            {"role":"user","content": prompt}
        ], "temperature": 0.3, "max_tokens": 120}).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})

    with urllib.request.urlopen(req, timeout=30) as r:
        result = json.loads(r.read())["choices"][0]["message"]["content"].strip()
    return None if result == "SKIP" else result

# Main
INPUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "data/cmm_test_v2_to_rewrite.json")
OUTPUT = INPUT.replace("_v2_to_rewrite", "_v2_rewritten")

with open(INPUT) as f:
    data = json.load(f)

rewritten, skipped = [], 0
for i, d in enumerate(data):
    try:
        r = rewrite_one(d["description"], d["subject"])
        if r:
            rewritten.append({"id": d["id"], "subject": d["subject"],
                            "difficulty": d["difficulty"], "description": r,
                            "original": d["description"]})
        else:
            skipped += 1
        if (i+1) % 20 == 0:
            print(f"  [{i+1}/{len(data)}] ok={len(rewritten)} skip={skipped}")
        time.sleep(0.3)
    except Exception as e:
        skipped += 1
        print(f"  [{i+1}] ERROR: {e}")

with open(OUTPUT, "w") as f:
    json.dump(rewritten, f, ensure_ascii=False, indent=2)
print(f"\nWritten {len(rewritten)} rewritten descriptions to {OUTPUT}")
