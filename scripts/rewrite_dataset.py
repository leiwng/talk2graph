#!/usr/bin/env python3
"""
Step 2: Rewrite CMM-Math geometry problems into explicit TikZ figure descriptions.
Uses the user's configured LLM via the environment.
"""

import json
import os
import sys

# Try to use the user's existing API config
# Uses the same provider/model the user has configured in Hermes
API_BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
API_KEY = os.environ.get("OPENAI_API_KEY", os.environ.get("DEEPSEEK_API_KEY", ""))
MODEL = os.environ.get("TALK2GRAPH_MODEL", "deepseek-chat")

if not API_KEY:
    print("ERROR: Set OPENAI_API_KEY or DEEPSEEK_API_KEY environment variable")
    print("Or run: export DEEPSEEK_API_KEY=sk-...")
    sys.exit(1)

import urllib.request

def rewrite_description(fig_ctx, subject, full_question):
    """Use LLM to rewrite a math problem into a figure-drawing instruction."""
    prompt = f"""你是一个数学图形描述专家。将下面的数学问题改写为明确的作图指令。

规则：
1. 提取题目中描述的图形信息（形状、尺寸、角度、位置关系等）
2. 用中文以"画出"或"画"开头
3. 只描述要画的图形，不包含"求"、"证明"、"计算"等解题要求
4. 如果原题没有可画的图形（纯代数计算），回复"SKIP"
5. 保持所有数学符号（LaTeX格式）

学科: {subject}
原题: {fig_ctx}

只输出改写后的作图指令，不超过一行："""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "你是数学图形描述专家。只输出改写后的作图指令或SKIP，不要解释。"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 200,
    }

    try:
        req = urllib.request.Request(
            f"{API_BASE}/chat/completions",
            data=json.dumps(payload).encode(),
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        result = data["choices"][0]["message"]["content"].strip()
        return result if result != "SKIP" else None
    except Exception as e:
        print(f"    LLM error: {e}")
        return None

# --- Main ---
INPUT_PATH = "/Users/leiwng/projects/code/talk2graph/data/cmm_test_v2_to_rewrite.json"
OUTPUT_PATH = "/Users/leiwng/projects/code/talk2graph/data/cmm_test_v2_rewritten.json"

with open(INPUT_PATH) as f:
    dataset = json.load(f)

rewritten = []
skipped = 0

print(f"Rewriting {len(dataset)} samples with {MODEL}...")
for i, d in enumerate(dataset):
    result = rewrite_description(
        d["description"],
        d["subject"],
        d.get("full_question", ""),
    )
    if result:
        rewritten.append({
            "id": d["id"],
            "subject": d["subject"],
            "difficulty": d["difficulty"],
            "description": result,
            "original": d["description"],
        })
        if (i + 1) % 20 == 0:
            print(f"  [{i+1}/{len(dataset)}] {len(rewritten)} rewritten, {skipped} skipped")
    else:
        skipped += 1

with open(OUTPUT_PATH, "w") as f:
    json.dump(rewritten, f, ensure_ascii=False, indent=2)

print(f"\nDone: {len(rewritten)} rewritten, {skipped} skipped")
print(f"Saved to: {OUTPUT_PATH}")
