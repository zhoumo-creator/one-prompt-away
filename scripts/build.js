// 读取 prompts/*.md 的 front matter，生成 prompts.json，并更新 README 徽章上的条数
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "prompts");
const required = ["id", "title", "summary", "category", "source", "author"];

const prompts = readdirSync(dir)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .sort()
  .map((file) => {
    const raw = readFileSync(join(dir, file), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: 缺少 front matter`);
    const meta = parse(match[1]);
    const body = match[2].trim();

    const missing = required.filter((k) => !meta[k]);
    if (missing.length) throw new Error(`${file}: 缺少必填字段 ${missing.join(", ")}`);
    if (`${meta.id}.md` !== file) throw new Error(`${file}: id 应为 ${file.replace(/\.md$/, "")}`);

    const prompt = body.match(/## Prompt[\s\S]*?```[^\n]*\n([\s\S]*?)```/)?.[1].trim();
    if (!prompt) throw new Error(`${file}: 「## Prompt」下面没有代码块`);

    return {
      id: meta.id,
      title: meta.title,
      summary: meta.summary,
      category: meta.category,
      audience: meta.audience ?? [],
      tags: meta.tags ?? [],
      source: meta.source,
      author: meta.author,
      viral_date: meta.viral_date ? String(meta.viral_date) : null,
      tested: meta.tested ?? [],
      prompt,
      body,
      url: `https://github.com/zhoumo-creator/one-prompt-away/blob/main/prompts/${file}`,
    };
  });

writeFileSync(join(root, "prompts.json"), JSON.stringify(prompts, null, 2) + "\n");

const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");
writeFileSync(readmePath, readme.replace(/badge\/prompts-\d+-/, `badge/prompts-${prompts.length}-`));

console.log(`prompts.json: ${prompts.length} 条`);
