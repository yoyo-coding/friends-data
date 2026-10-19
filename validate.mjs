#!/usr/bin/env node
/**
 * 友链 PR 自动校验：
 *  1. 校验 data/friends/*.json 格式与必填字段
 *  2. url 唯一性
 *  3. 双向链接验证：访问 PR 新增友链的 backlink 页面，确认包含本站链接
 *  - 全部通过 → 输出 valid=true（触发自动合并）
 *  - 失败 → 在 PR 上评论原因，输出 valid=false
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SITE_URL = process.env.SITE_URL ?? "https://yoyo-coding.github.io/me";
const GH = process.env.GH_TOKEN ?? "";
const REPO = process.env.GITHUB_REPOSITORY ?? "";
const PR = process.env.PR_NUMBER ?? "";

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GH}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function getChangedFriendFiles() {
  if (!GH || !REPO || !PR) return null;
  try {
    const files = await gh(`repos/${REPO}/pulls/${PR}/files?per_page=100`);
    return files.map((f) => f.filename).filter((f) => f.startsWith("data/friends/") && f.endsWith(".json"));
  } catch {
    return null;
  }
}

const errors = [];
const newFiles = await getChangedFriendFiles();
const friendsDir = join(process.cwd(), "data", "friends");
const files = readdirSync(friendsDir).filter((f) => f.endsWith(".json"));
const seenUrls = new Map();

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(friendsDir, file), "utf8"));
  } catch (e) {
    errors.push(`${file}: 不是合法 JSON（${e.message}）`);
    continue;
  }

  let broken = false;
  for (const key of ["name", "url"]) {
    if (typeof data[key] !== "string" || !data[key].trim()) {
      errors.push(`${file}: 缺少必填字段 "${key}"`);
      broken = true;
    }
  }
  if (broken) continue;

  if (!isHttpUrl(data.url)) errors.push(`${file}: url 不是合法的 http(s) 地址`);
  // backlink 选填：提供时才做双向链接验证
  if (data.backlink && !isHttpUrl(data.backlink)) errors.push(`${file}: backlink 不是合法的 http(s) 地址`);
  if (data.avatar && !isHttpUrl(data.avatar)) errors.push(`${file}: avatar 不是合法的 http(s) 地址`);

  if (seenUrls.has(data.url)) errors.push(`${file}: url 与 ${seenUrls.get(data.url)} 重复`);
  else seenUrls.set(data.url, file);

  const isNew = !newFiles || newFiles.includes(`data/friends/${file}`);
  if (isNew && isHttpUrl(data.backlink)) {
    try {
      const html = await fetchText(data.backlink);
      if (!html.includes("yoyo-coding.github.io/me")) {
        errors.push(
          `${file}: 双向链接验证失败 —— 访问 ${data.backlink} 未发现指向 ${SITE_URL} 的链接。请先在你的页面添加本站链接后再重新提交。`,
        );
      }
    } catch (e) {
      errors.push(`${file}: 无法访问 backlink ${data.backlink}（${e.message}）`);
    }
  }
}

if (errors.length > 0) {
  console.error("校验失败：\n" + errors.map((e) => ` - ${e}`).join("\n"));
  if (GH && REPO && PR) {
    try {
      await gh(`repos/${REPO}/issues/${PR}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body:
            "❌ 友链自动校验未通过：\n\n" +
            errors.map((e) => `- ${e}`).join("\n") +
            "\n\n请修正后重新提交 PR。",
        }),
      });
    } catch (e) {
      console.error("评论失败:", e.message);
    }
  }
  console.log("valid=false");
  process.exit(1);
} else {
  console.log(`✅ 校验通过：${files.length} 个友链全部合法。`);
  console.log("valid=true");
}