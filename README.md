# friends-data — 友情链接数据仓库

本仓库存储 [执着yoyo 的数字花园](https://yoyo-coding.github.io/me) 的友情链接数据。
网站会自动读取 `data/friends/` 目录下的所有 JSON 文件并展示在 [About 页](https://yoyo-coding.github.io/me/about/) 的「友情链接」板块。

## 如何申请友链（全自动，无需人工审核）

1. **Fork 本仓库**，打开 `data/friends/` 目录
2. 点右上角 **Create new file**，文件名以 `.json` 结尾（例如 `我的博客.json`）
3. 粘贴以下模板并替换成你的信息：

```json
{
  "name": "你的站点名称",
  "avatar": "https://你的头像URL（可选）",
  "description": "简短描述（可选）",
  "url": "https://你的网站URL",
  "backlink": "https://你的网站/友链页（可选）"
}
```

4. 提交 Pull Request，**自动校验通过后自动合并上线**

## 校验规则

自动流程会检查：

| 规则 | 说明 |
|---|---|
| JSON 格式 | 必须是合法 JSON |
| 必填字段 | `name`、`url` 必填且为合法 URL |
| 双向链接（可选） | 如果填写了 `backlink`，系统会访问该页面，确认其中包含指向 `https://yoyo-coding.github.io/me` 的链接 |

双向链接验证通过后 PR 自动合并；未通过会自动关闭并附评论说明原因。

## 加上本站链接（推荐）

如果你希望做双向友链，可在你的网站合适位置（如友链页、关于页或页脚）添加本站链接，并在 JSON 里填写 `backlink` 供自动验证：

```html
<a href="https://yoyo-coding.github.io/me">执着yoyo</a>
```

## 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 站点名称 |
| `url` | ✅ | 站点首页地址 |
| `backlink` | — | 你放置本站链接的页面地址（填写后自动做双向验证） |
| `avatar` | — | 站点头像图片 URL，建议正方形 |
| `description` | — | 一句话描述 |

遇到问题可[提 Issue](https://github.com/yoyo-coding/friends-data/issues/new)。
