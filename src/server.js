#!/usr/bin/env node
// one-prompt-away MCP server：优先拉取 GitHub 上最新的 prompts.json，失败时用包里自带的版本
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const REMOTE_URL =
  "https://raw.githubusercontent.com/zhoumo-creator/one-prompt-away/main/prompts.json";
const CACHE_MS = 10 * 60 * 1000;

const bundled = JSON.parse(readFileSync(new URL("../prompts.json", import.meta.url), "utf8"));
let cache = { data: bundled, at: 0 };

async function loadPrompts() {
  if (Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const res = await fetch(REMOTE_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) cache = { data: await res.json(), at: Date.now() };
  } catch {
    // 离线或超时：继续用上一份数据
  }
  cache.at = Date.now();
  return cache.data;
}

// 中文没有空格，拆成单词 + 两字组合，按命中率打分
function terms(query) {
  const words = query.toLowerCase().split(/[\s,，。、？?！!；;：:]+/).filter(Boolean);
  const out = new Set(words);
  for (const w of words) {
    if (/[一-鿿]/.test(w)) for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
  }
  return [...out];
}

function score(p, qs) {
  const fields = [
    [p.title, 3],
    [[p.summary, p.category, ...p.audience, ...p.tags].join(" "), 2],
    [p.body, 1],
  ].map(([text, w]) => [text.toLowerCase(), w]);
  return qs.reduce((sum, q) => sum + fields.reduce((s, [t, w]) => s + (t.includes(q) ? w : 0), 0), 0);
}

const brief = ({ id, title, summary, category, audience, tags, author, url }) => ({
  id, title, summary, category, audience, tags, author, url,
});

const json = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "one-prompt-away", version: "0.1.0" });

server.registerTool(
  "search_prompts",
  {
    title: "搜索 prompt",
    description:
      "在「一个 Prompt 的距离」收藏夹里搜索 prompt。query 留空即可浏览全部；可按分类（category）或人群（audience）筛选，可选值用 list_tags 查看。返回摘要，完整内容用 get_prompt 获取。",
    inputSchema: {
      query: z.string().optional().describe("关键词或自然语言描述，如「营销 标题」「认识自己」"),
      category: z.string().optional().describe("分类，如「照镜子」「生图」"),
      audience: z.string().optional().describe("人群，如「营销人」「文科生」"),
      limit: z.number().int().min(1).max(50).optional().describe("最多返回几条，默认 10"),
    },
  },
  async ({ query, category, audience, limit = 10 }) => {
    let list = await loadPrompts();
    if (category) list = list.filter((p) => p.category === category);
    if (audience) list = list.filter((p) => p.audience.includes(audience));
    if (query?.trim()) {
      const qs = terms(query);
      list = list
        .map((p) => ({ p, s: score(p, qs) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .map(({ p }) => p);
    }
    return json({ total: list.length, results: list.slice(0, limit).map(brief) });
  }
);

server.registerTool(
  "get_prompt",
  {
    title: "获取 prompt",
    description: "按 id 获取一条 prompt 的完整内容：可直接复制的 prompt 原文、用法、出处和变体。",
    inputSchema: { id: z.string().describe("prompt 的 id，来自 search_prompts 的结果") },
  },
  async ({ id }) => {
    const p = (await loadPrompts()).find((x) => x.id === id);
    if (!p) return { isError: true, content: [{ type: "text", text: `没有找到 id 为 ${id} 的 prompt` }] };
    return json(p);
  }
);

server.registerTool(
  "list_tags",
  {
    title: "列出分类和标签",
    description: "列出所有分类、人群和标签，以及每个下面有几条 prompt。",
    inputSchema: {},
  },
  async () => {
    const count = (values) =>
      Object.fromEntries(
        Object.entries(values.reduce((m, v) => ({ ...m, [v]: (m[v] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
      );
    const list = await loadPrompts();
    return json({
      total: list.length,
      categories: count(list.map((p) => p.category)),
      audiences: count(list.flatMap((p) => p.audience)),
      tags: count(list.flatMap((p) => p.tags)),
    });
  }
);

await server.connect(new StdioServerTransport());
