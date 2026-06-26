#!/usr/bin/env python3
"""
Build talk2graph test dataset from CMM-Math geometry questions.
Generates two versions per case:
  - v1: Original problem text (real user scenario)
  - v2: Rewritten as explicit figure description
"""

import json
import random
import os

# --- Config ---
DATA_DIR = "/tmp/cmm-math/data"
OUTPUT_DIR = "/Users/leiwng/projects/code/talk2graph/data"
SAMPLES_PER_CATEGORY = {
    "解析几何": 40,
    "度量几何学": 30,
    "立体几何学": 20,
    "组合几何学": 15,
    "画法几何学": 15,
    "变换几何": 10,
}
TOTAL_TARGET = 130

# --- Load ---
samples = []
for fname in ["test_data.jsonl", "train_data.jsonl"]:
    path = os.path.join(DATA_DIR, fname)
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                s = json.loads(line)
                s["_source"] = fname
                samples.append(s)

print(f"Loaded {len(samples)} total samples")

# --- Filter geometry subjects ---
GEO_SUBJECTS = set(SAMPLES_PER_CATEGORY.keys())
geo = [s for s in samples if s.get("subject") in GEO_SUBJECTS]
print(f"Geometry samples: {len(geo)}")

# --- Extract figure descriptions ---
def extract_fig_context(question, subject):
    """Extract the part of the question that describes the figure."""
    q = question.replace("<ImageHere>", "").strip()
    # Split at common problem-end markers
    for sep in ["等于", "则", "求", "则角", "那么", "满足"]:
        idx = q.find(sep)
        if idx > 20:
            q = q[:idx].strip()
            break
    # Remove answer choices
    for bracket in ["A.", "B.", "C.", "D.", "(A)", "(B)", "(C)", "(D)"]:
        idx = q.find(f" {bracket}")
        if idx > 0:
            q = q[:idx].strip()
            break
        idx = q.find(f"\n{bracket}")
        if idx > 0:
            q = q[:idx].strip()
            break
    return q if len(q) > 8 else question[:120]

def classify_difficulty(subject, text):
    """Rough difficulty estimate."""
    if "立体" in subject or "变换" in subject:
        return "困难"
    if any(kw in text for kw in ["椭圆", "抛物线", "双曲线", "外接", "内切", "三视图"]):
        return "困难"
    if any(kw in text for kw in ["中点", "中线", "角平分", "对称", "平行四边", "梯形"]):
        return "中等"
    return "基础"

# --- Build dataset ---
dataset_v1 = []  # Original
dataset_v2 = []  # Rewritten

# Per-subject sampling
random.seed(42)
os.makedirs(OUTPUT_DIR, exist_ok=True)

for subject, count in SAMPLES_PER_CATEGORY.items():
    subject_samples = [s for s in geo if s["subject"] == subject]
    selected = random.sample(subject_samples, min(count, len(subject_samples)))

    for s in selected:
        q_clean = s["question"].replace("<ImageHere>", "").strip()
        fig_ctx = extract_fig_context(s["question"], subject)
        difficulty = classify_difficulty(subject, fig_ctx)

        # v1: Original
        dataset_v1.append({
            "id": s["id"],
            "subject": subject,
            "difficulty": difficulty,
            "description": fig_ctx,
            "full_question": q_clean[:300],
            "original_image": s.get("image", []),
        })

        # v2: Rewritten as explicit instruction
        dataset_v2.append({
            "id": s["id"],
            "subject": subject,
            "difficulty": difficulty,
            "description": fig_ctx,
            "full_question": q_clean[:300],
            "rewrite_pending": True,  # Will be filled by LLM
        })

print(f"\nDataset v1 (original): {len(dataset_v1)} samples")
print(f"Dataset v2 (to-rewrite): {len(dataset_v2)} samples")

# --- Distribution ---
print("\nDifficulty distribution:")
for diff in ["基础", "中等", "困难"]:
    count = sum(1 for d in dataset_v1 if d["difficulty"] == diff)
    print(f"  {diff}: {count}")

print("\nSubject distribution:")
for subj in SAMPLES_PER_CATEGORY:
    count = sum(1 for d in dataset_v1 if d["subject"] == subj)
    print(f"  {subj}: {count}")

# --- Save ---
v1_path = os.path.join(OUTPUT_DIR, "cmm_test_v1_original.json")
v2_path = os.path.join(OUTPUT_DIR, "cmm_test_v2_to_rewrite.json")

with open(v1_path, "w") as f:
    json.dump(dataset_v1, f, ensure_ascii=False, indent=2)
with open(v2_path, "w") as f:
    json.dump(dataset_v2, f, ensure_ascii=False, indent=2)

print(f"\nSaved:")
print(f"  v1: {v1_path}")
print(f"  v2: {v2_path}")
print(f"\nNow run step 2 to rewrite v2 with LLM...")
