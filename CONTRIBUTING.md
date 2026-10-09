# 投稿指南

谢谢你愿意分享！这里收的是**有用、有趣、复制就能用**的 prompt。

## 两种投稿方式

1. **不想动手**：[提一个 Issue](../../issues/new?template=submit-prompt.yml)，填好表单就行，我来整理成卡片。
2. **想直接提 PR**：复制 [`prompts/_template.md`](prompts/_template.md)，改名为 `你的-prompt-id.md`，填好内容后提 PR。

## 收录要求

**必填**

- **出处**：原帖或报道链接 + 原作者。自己写的就填你自己。
- **可以直接复制**：prompt 正文放在「## Prompt」下的代码块里，复制后改动不超过一处就能用。

**加分项**

- 实测模型和测试日期（front matter 里的 `tested`）
- 效果截图，放在 `assets/`，文件名和 id 一致

## 不收

- 越狱、绕过安全限制
- 涉及真人隐私、色情内容
- 营销软文

## 分类

- `category`（必填，选一个）：照镜子 / 生图 / 角色扮演与游戏 / 写作 / 职场 / 学习 / 生活 / Agent 与编程 / 纯整活
- `audience`（可选，可多选）：营销人 / 文科生 / 不会写代码但想做东西的人

想加新分类或人群，在 Issue 里提就好。

## 本地预览（可选）

```bash
npm install
npm run build   # 校验字段，生成 prompts.json
```

合并到 main 之后，GitHub Action 会自动重新生成 `prompts.json`，不提交也没关系。
