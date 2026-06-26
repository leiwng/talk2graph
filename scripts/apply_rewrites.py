#!/usr/bin/env python3
"""Apply batch rewrites to CMM-Math v2 dataset."""

import json

rewrites = {
    # Format: index -> rewritten_description (None = skip pure computation)
    0: "画一个圆内接四边形ABCD，边长分别为AB=2，BC=6，CD=DA=4",
    3: "画一条数轴，标出A、B、C三点，其中一点与其他两点距离满足2倍关系",
    6: "画△ABC，已知边a=1，b=√3，角A=30°",
    9: "画直角三角形ABC，AC是AB的2倍",
    14: "画Rt△ABC，直角边AC=3，BC=4，以AC为直径作半圆，交斜边AB于点D",
    15: "画抛物线y²=2x，标出准线",
    16: "画两圆⊙O₁与⊙O₂内切，半径分别为2和3",
    18: "画等边三角形，边长为1",
    20: "画椭圆，标出焦点F₁、F₂和动点P，延长F₁P到Q使PQ=PF₂",
    22: "画△ABC，∠ABC=90°，AB=1，BC=2，将AC绕A旋转90°得到AD",
    25: "画△ABC，三边满足a⁴+b⁴+c⁴=2c²(a²+b²)",
    33: "画圆O，AB为直径，弦CD⊥AB于点H，∠A=30°，CD=2√3",
    34: "画△ABC，b=2，A=120°，面积S=√3",
    35: "画等腰△ABC（AB=AC），以AB为直径作圆交BC于D，过D作切线交AC于E",
    37: "画二次函数y=-½x²+bx+c的图像，经过点A(2,0)和B(0,-6)",
    39: "在同一坐标系中画反比例函数y₁=k/x和正比例函数y₂=x的图像，交点P(3,m)",
    40: "画长方形地块，长(3a+b)米，宽(2a+b)米，中间有雕像基座",
    42: "画△ABC，用尺规作图作出BC的垂直平分线（以B、C为圆心，大于½BC为半径画弧相交）",
    43: "画圆O半径4，OD⊥弦BC，OD=2",
    44: "画四边形ABCD，AD∥BC，AC与BD交于E，E是BD中点，延长CD到F使DF=CD，连接AF，AB=4，AF=8，∠F=30°",
    46: "画一个窗户形状：上半部是半圆，下半部是矩形，窗框总长6m",
    48: "画菱形ABCD，边长10cm，对角线AC=16cm",
    52: "画△ABC，D、E在AC和BC上，DF⊥AB，DG⊥BC，DF=DG，BE=DE",
    54: "画池塘两端A、B，在外部取点O，连接AO和BO并延长到C、D，使AO=DO，BO=CO，连接CD",
    55: "画两条相交直线，标出∠1=30°，∠2=110°，∠3未知",
    56: "画圆内接四边形ABCD，∠A=125°",
    58: "画△ABC和△AEF，F在BC上，AB=AE，BC=EF，∠B=∠E",
    59: "画一副三角尺拼在一起的图形，标出∠A、∠B、∠BCD、∠D、∠AED",
    64: "画△ABC，AC=√6，BC=2，∠A=45°",
    65: "画直角三角形，直角边30cm和40cm，斜边50cm，按1:5缩小",
    66: "画锐角△ABC的外接圆O，OD⊥AB，OE⊥BC，OF⊥AC",
    70: "画一个圆锥和一个圆柱，底面半径相等",
    74: "画由5个正方体组成的立体图形（给出从上面和前面看到的视图）",
    78: "画四棱锥S-ABCD，底面为正方形，SD⊥底面",
    79: "画一个粮仓：下半部是圆柱（底面周长18.84m，高2m），上半部是圆锥（高0.6m）",
    82: "画正方体展开图，字母A在其中一面",
    87: "画梯形，以上底所在直线为轴旋转一周，形成旋转体",
    88: "画多面体的三视图（网格正方形边长1）",
    90: "画三条平行线AB∥CD∥EF，AF和BE交于O，AO=OD=DF",
    93: "画△ABC，∠BAC=90°，AB=AC，MN是过A的直线，BD⊥MN",
    95: "画△ABC，D为内心，∠A=60°，CD=2，BD=4",
    96: "画△ABC内接于圆O，AB=AC，连接AO延长交BC于M",
    97: "画△ABC和△ABD，∠C=∠D=90°，AC=AD，∠CBD=130°",
    100: "画线段AE，在AE同侧作等边△ABC和等边△CDE，AD交BE于O，AD交BC于P",
    101: "画Rt△ABC，∠ACB=90°，以三条边向外作正方形，顶点都在同一个圆上",
    102: "画圆O，PA、PB、EF分别切圆于A、B、D，PA=10cm",
    103: "画等边△ABC和等边△CDE，AD和BE交于F",
    104: "画从A点出发的折线：AB=BC=CD=DE=EF，∠A=15°",
    105: "画两间矩形饲养室，一面靠墙（墙长12m），中间一道隔墙，三处各留1m门，材料总长27m",
    111: "画三角形余料ABC，BC=80cm，高AD=60cm，加工成两个相同正方形",
    113: "在1×1网格中画△ABC，A(-3,2)，B(-4,-3)，C(-1,-1)，再画关于y轴对称的图形",
    115: "画已知圆O和一点A，只用圆规作图",
    122: "在方格纸中画正方形ABCD和△EFG",
    123: "画长方形ABCD，AB=10cm，BC=6cm，沿BC方向平移",
    128: "画Rt△ABC，∠BAC=90°，AB=3cm，AC=4cm，沿BC方向平移2.5cm",
    129: "在平面直角坐标系中画四边形ABCD，A(-6,6)，B(-8,2)，C(-4,0)，D(-2,4)",
}

with open('/Users/leiwng/projects/code/talk2graph/data/cmm_test_v2_to_rewrite.json') as f:
    data = json.load(f)

rewritten = []
skipped = 0
for i, d in enumerate(data):
    if i in rewrites:
        rewritten.append({
            "id": d["id"],
            "subject": d["subject"],
            "difficulty": d["difficulty"],
            "description": rewrites[i],
            "original": d["description"],
        })
    else:
        skipped += 1

out_path = '/Users/leiwng/projects/code/talk2graph/data/cmm_test_v2_rewritten.json'
with open(out_path, 'w') as f:
    json.dump(rewritten, f, ensure_ascii=False, indent=2)

print(f"v2 rewritten: {len(rewritten)} descriptions (skipped {skipped} pure computation)")
print(f"Saved: {out_path}")

# Also show both versions side by side
print("\n--- Sample: v1 vs v2 ---")
for i in [0, 65, 101, 34]:
    if i < len(rewritten):
        orig = data[i]["description"]
        new = rewritten[i]["description"]
        print(f"\n[{i}] {data[i]['subject']}")
        print(f"  v1: {orig[:120]}")
        print(f"  v2: {new}")
