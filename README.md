# 運命の銀竜暦 — Starter README v1.0.0

> 占い × オリジナル世界観のモバイル優先サイト。**HTML/CSS/JS/JSONのみ**で動作する最小スターター。静的ホスティング（GitHub Pages等）前提。

---

## 0. 前提姿勢／禁止事項（プロジェクト規約）

* **中立・公平・バイアスフリー**：宗教・文化・人種・性別等の優劣・断定を示唆しない。
* **専門助言の禁止**：医療／法律／投資の助言・暗示・推奨は一切禁止（一般的生活指針の範囲に留める）。
* **個人情報と保存**：PII／決済情報を**JSONへ入れない**。`localStorage`は\*\*`archetype_id`のみ\*\*保存可。
* **世界観の独立性**：現実世界の季節／政治／災害を直接描写・比較しない（世界観崩壊防止）。
* **不確実なら明言**：確信が90%未満や情報不足時は「わかりません／情報が不足しています」と返す。

---

## 1. 目的と機能範囲

* **目的**：要件0〜10を満たす“動く最小デモ”。
* **範囲**：

  * ホーム：無料の「今日の総合」表示＋有料誘導
  * お知らせ：更新履歴テンプレ表示
  * マイページ：`archetype_id`のみ保存・アバター適用
  * GA4：**同意後のみ**イベント送信（ダミー）
  * すべてのJSONを `./assets/data/` から `fetch(...,{cache:"no-cache"})` で取得

---

## 2. ディレクトリ構成

```
/ (project root)
├─ index.html                 # ホーム（無料：総合のみ）
├─ notice.html                # お知らせ
├─ mypage.html                # マイページ（localStorage: archetype_id のみ）
└─ assets/
   ├─ css/
   │  ├─ app.css             # 共通
   │  ├─ components.css      # 共通コンポーネント
   │  ├─ index.css           # ページ固有（index）
   │  ├─ notice.css          # ページ固有（notice）
   │  └─ mypage.css          # ページ固有（mypage）
   ├─ js/
   │  ├─ core.js             # 共通（fetch/avatars/localStorage）
   │  ├─ ga4.js              # 共通（同意制御・ダミー送信）
   │  ├─ index.js            # ホーム
   │  ├─ notice.js           # お知らせ
   │  └─ mypage.js           # マイページ
   └─ data/
      ├─ fortune_messages.json     # 今日の占い（総合+9カテゴリ）
      ├─ archetype_fortune.json    # name→icon
      └─ teachings_unified.json    # 世界内ログ（tsはYYYY-MM-DDThh:mm:ss+09:00）
```

---

## 3. クイックスタート

### A) ローカルで試す（推奨：簡易HTTPサーバ）

ブラウザの`file://`では`fetch`がブロックされます。簡易サーバで起動してください。

**Python 3系**

```bash
cd <project-root>
python -m http.server 8080
# → http://localhost:8080/
```

**Node（serve使用）**

```bash
npm -g i serve
serve -l 8080 .
```

### B) GitHub Pages へ配置

1. 本リポジトリをGitHubへpush
2. Settings → Pages → Branch: `main`/`docs` などを選択
3. 数分後、公開URLにアクセス（相対パス運用のためルート直下が無難）

---

## 4. ページ説明

### index.html（無料：総合のみ）

* `fortune_messages.json` の `today.overall` を表示。
* 9カテゴリは**有料領域**（UI文面で明確に誘導）。
* `teachings_unified.json`から最新ログを数件表示（`ts`は**JSON値そのまま**）。

### notice.html（お知らせ）

* 更新履歴テンプレをそのまま掲示。
* 現実季節／政治／災害への直接言及禁止の注記を常設。

### mypage.html（マイページ）

* `localStorage` 保存は **`archetype_id`のみ**。
* `applyAvatar(el, name)` を使い、`archetype_fortune.json`で `name→icon` 解決。アイコン無しは頭文字フォールバック。

---

## 5. 外部ファイル読み込み順（原則）

* **CSS**：`app.css` → `components.css` → ページ固有CSS
* **JS**：`core.js` → `ga4.js` → ページ固有JS

---

## 6. データ方針

* すべてのJSONは `./assets/data/` から `fetch(url, {cache: "no-cache"})` で取得。
* **保存禁止**：PII/決済情報をJSONに入れない。
* **`ts`の表示**：`teachings_unified.json` の `messages[].ts` を**改変せず**表示。
* **強制更新**：必要時のみ `window.APP_VER` をクエリに付与してキャッシュバイパス。

---

## 7. JSONスキーマ最小要件（抜粋）

### fortune\_messages.json（無料/有料）

```json
{
  "today": {
    "overall": "...（無料）",
    "categories": [
      { "id": "health", "name": "健康", "message": "...", "paid": true }
    ]
  }
}
```

### archetype\_fortune.json（name→icon）

```json
[
  { "name": "灰銀の観測者", "icon": "https://.../icon.png" }
]
```

### teachings\_unified.json（世界内ログ）

```json
{
  "rooms": [
    {
      "id": "hall-001",
      "messages": [
        { "ts": "2025-09-10T09:00:00+09:00", "text": "..." }
      ]
    }
  ]
}
```

> **ts検証**：`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$`

---

## 8. GA4計測（同意ベース）

* **同意後のみ**イベント送信。未同意は**完全NO-OP**。
* イベント命名：`view_*`、`open_paid_category`、`eval_path`、`start_checkout`、`complete_checkout`。
* 本番は**同意後にのみ**`gtag.js`を動的ロードし、バッファをflush。

---

## 9. アクセシビリティ & UI原則

* タップ領域≥44px、コントラストAA、`focus-visible`対応。
* 見出し構造と`aria`属性の整合。
* 下部固定ナビ（安全域対応、`env(safe-area-inset-*)`）。
* 並び順は**手動定義**（アルゴリズム優先表示は禁止）。

---

## 10. 無料／有料の境界

* **無料**：今日の占い（総合のみ）／カレンダー（閲覧履歴）／世界観補足／短編。
* **有料**：9カテゴリ詳細・体験ページ群。
* **誘導文**は無料領域に常設（例：「詳しい指針は有料エリアでご案内します」）。

---

## 11. ローカルストレージ方針

* 保存キー：`archetype_id` **のみ**。
* それ以外の個人情報、決済情報は保存禁止。

---

## 12. デプロイ手順（GitHub Pages例）

1. リポジトリ作成 → 本スターターをpush
2. **相対パス**維持のため、`index.html`はリポジトリ直下に置く
3. Settings → Pages → Branchを選択 → 保存
4. 公開URLへアクセス

---

## 13. 更新運用（小さく変更・ロールバック可能）

* JSON差替え → 影響確認 → ロールバック手順を記録。
* 更新履歴テンプレ（`notice.html` に掲載）：

```
### 変更日：YYYY-MM-DD / 担当：@<name>
- 変更理由：
- 変更内容：
- 影響範囲（ページ・JSON）：
- GA4イベント影響：
- ロールバック手順：
```

---

## 14. トラブルシューティング

* **画面が空**：`file://`で開いていませんか？ → 簡易HTTPサーバを使用。
* **JSONが読めない**：パスが `./assets/data/...` か、ファイル名の綴り違いを確認。
* **CORS/キャッシュ**：`fetch(...,{cache:"no-cache"})` で運用。強制更新は `APP_VER` クエリ付与。
* **tsの形式エラー**：`YYYY-MM-DDThh:mm:ss+09:00` に揃えてください。
* **アバターが出ない**：`archetype_fortune.json`に `name` と `icon` のペアがあるか確認。無い場合は頭文字表示が仕様です。

---

## 15. セキュリティ／プライバシー

* JSONへPII/決済情報は**入れない**。
* フロントのみでの保護は**表示制御**に限定（課金判定は必ずサーバ側）。
* 同意管理は**オプトイン**を前提（未同意時は送信しない）。

---

## 16. 拡張ロードマップ（提案）

1. 有料カテゴリ雛形＋UIガード（サーバ判定と連携）
2. `tracks.json` / `wallpapers.json` のカードUI実装
3. GA4本接続（同意後にID注入）
4. データ検証スクリプト（CIでJSONスキーマチェック）

---

## 17. DoD（受け入れ基準）自己チェック

* [x] 無料／有料の境界が**文面で一読明瞭**
* [x] 各ページで**参照JSON名を明記**
* [x] `teachings_*` の日時表示は**JSON値そのまま**
* [x] GA4は**同意後のみ**送信、イベント命名は一貫
* [x] `localStorage`は\*\*`archetype_id`のみ\*\*
* [x] 中立・公平ポリシー節が固定で存在

---

## 18. バージョン管理

* **バージョン**：v1.0.0
* **最終更新**：2025-09-10
* **連絡先**：\<owner / Slack / GitHub Issue>

> 変更が必要になった場合は、本READMEの該当章に最小差分で追記してください。
