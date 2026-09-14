# MARD 221 v2026-09-14 色板来源与边界

## 冻结的代码体系与市售核对格式

- 代码体系：MARD 221 色（A–H 与 M，共 221 个源代码），公开工具站核对数据。
- 市售规格线索：2.6 mm 融合拼豆（mini）。这不是对原厂 MARD、卖家、库存、批次或实物颜色的确认。
- 下单格式规则：源色号为 `A1`、`B1` 等；CSV 的 `purchase_code` 为零填充两位数字形式，即 `A1 → A01`、`B1 → B01`、`M15 → M15`。所有九个组均按此规则生成，不存在例外组。
- 本工具不会把“同款”“兼容”写成“原厂 MARD”。购买者须在实际商品页逐项核对颜色体系、`2.6 mm`、市售代码、卖家标识、批次和库存；不能用 5 mm 或其他品牌替代后宣称色差可控。

## 记录的公开来源（检索日期：2026-09-14）

1. 色号与屏幕 RGB：HansBug 的公开数据集 `mard-221-alfonse-doudou/colors.json`，其 README 记录数据来自 Alfonse 与豆豆工坊 MARD 色卡的核对，并明确 RGB 是屏幕参考而非实物色。冻结源文件 SHA-256：`556a7e0098c0055bde47f78d430cc7d36cb3788c235f0238e6a610f64a46b0bf`。
   - https://github.com/HansBug/pindou-color-data/tree/main/mard-221-alfonse-doudou
   - https://www.alfonse.online/
   - https://www.doudougongfang.com/kb/beads/mard-palette
2. 可购买性交叉核对：公开商品页支持“2.6 mm、按 MARD 221 色号体系销售的补充豆”这一线索，并可见 `A04` 等零填充格式。至少一个可见页面的实际品牌字段为“宥致”，页面/标题也会出现“MARD同款/色号”等表述；它不能证明 MARD 原厂身份，不能证明任何卖家可买齐，也不能证明批次或实物色差。页面会变动，交付前需由购买者在下单页再次核对。
   - https://tao.hvcis.com/goods-mYRAR2xHktJDnPoXeyHzzDCot3-3RZ770FXVjaJKBQi0.html
   - https://www.yiwugo.com/product/detail/986773913.html

## 允许与禁止的表述

可以说：每个非背景格都映射到这一个冻结版本的 MARD 221 色号体系；CSV 同时列源色号、零填充市售下单核对代码与数量；RGB 映射可复现。

不能说：屏幕颜色就是实物颜色、任意卖家的“同款色”都等同原厂 MARD、已验证某个批次可直接买齐、实体成品已经复现预览、比所有一键工具更准确。

实物门槛：购买同一卖家同一规格的少量 A/B/C/M 色系样本，和打印色卡、实际熔接效果一起人工确认后，才能对特定卖家/批次给出采购建议。
