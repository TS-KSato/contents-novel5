# 運命の銀竜暦

ファンタジー世界「エテルナリア」を舞台にした占い・物語・レシピの総合サイト。銀竜ルナルの遺した知恵を、継承者たちが現代に伝えます。

## 概要

- **占い機能**：日替わりで変わる9カテゴリの占い結果
- **七夜の語り巻**：月刊連載形式の哲学的短編小説（全12ヶ月分）
- **竜の食卓**：ファンタジー世界の料理を現実で再現できるレシピ集
- **星座診断**：12星座×エテルナリア世界観での性格診断

## セットアップ

### 必要なもの
- GitHubアカウント
- テキストエディタ
- 基本的なHTML/CSS/JavaScriptの知識（カスタマイズする場合）

### 手順

1. このリポジトリをForkまたはClone
2. GitHub Pagesを有効化
   - Settings → Pages → Source を「Deploy from a branch」に
   - Branch を「main」に設定
3. `https://[username].github.io/[repository-name]/` でアクセス可能に

## ファイル構成

```
.
├── index.html           # トップページ（占い機能）
├── serial.html          # 七夜の語り巻（連載小説）一覧
├── article.html         # 語り巻の個別記事表示
├── food.html            # 竜の食卓（レシピ）トップ
├── food_alan.html       # アランの食卓
├── food_drake.html      # ドレイクの食卓
├── food_laila.html      # ライラの食卓
├── food_nester.html     # ネスターの食卓
├── recipe.html          # レシピ詳細表示
├── zodiac.html          # 星座診断ページ
├── partner.html         # 今日の導き手診断
├── novel.html           # 短編小説ページ
├── list.html            # おまけコンテンツ一覧
├── signup.html          # 会員登録ページ
│
├── fortune_messages.json # 占いメッセージデータ
├── quotes.json          # 日替わり名言データ
├── recipe.json          # レシピデータ（全42品）
├── laila_teachings.json # ライラの教え（Q&A形式）
├── articles_001.json    # 語り巻 第1月分（5記事）
├── articles_002.json    # 語り巻 第2月分（5記事）
├── articles_003.json    # 語り巻 第3月分（5記事）
├── articles_004.json    # 語り巻 第4月分（5記事）
├── articles_005.json    # 語り巻 第5月分（5記事）
├── articles_006.json    # 語り巻 第6月分（5記事）
├── articles_007.json    # 語り巻 第7月分（5記事）
├── articles_008.json    # 語り巻 第8月分（5記事）
├── articles_009.json    # 語り巻 第9月分（5記事）
├── articles_010.json    # 語り巻 第10月分（5記事）
├── articles_011.json    # 語り巻 第11月分（5記事）
├── articles_012.json    # 語り巻 第12月分（5記事）
│
├── assets/              # 画像ファイルディレクトリ
│   ├── char-lunal.png  # ルナルのアバター
│   ├── char-alan.png   # アランのアバター
│   └── char-lilia.png  # リリアのアバター
│
├── README.md            # このファイル
└── .nojekyll           # GitHub Pages用（_で始まるファイルを有効化）
```

## データ形式

### fortune_messages.json
```json
{
  "meta": {
    "version": 2,
    "characters": ["ルナル", "アラン", "リリア"],
    "free_categories": ["総合"]
  },
  "weights": {"5": 18, "4": 32, "3": 30, "2": 15, "1": 5},
  "categories": [
    {"key": "総合", "paid": false},
    {"key": "健康", "paid": true}
  ],
  "messages": {
    "総合": {
      "5": {
        "ルナル": "今日は追い風だ。遠慮なく行こう。",
        "アラン": "思った以上に進む日。素直に踏み出そう。"
      }
    }
  }
}
```

### recipe.json
```json
[
  {
    "id": 1,
    "character": "アラン",
    "title": "朝露のポタージュ",
    "intro": "父上が教えてくれた、野菜の声を聞く煮込み方",
    "ingredients": ["かぶら（両手で包める大きさを三つ）"],
    "steps": ["野菜を親指大に切り分ける"],
    "point": "急がないこと"
  }
]
```

### articles_XXX.json
```json
{
  "月度": "第1月",
  "語り巻": [
    {
      "題名": "記事タイトル",
      "語り手": "ドレイク・ストームブレイド",
      "語り手の肩書": "ルミノア地方の勇者・剣士",
      "lead": "リード文",
      "body": ["本文の段落1", "本文の段落2"],
      "free_paragraphs": 4,
      "tags": ["タグ1", "タグ2"]
    }
  ]
}
```

## カスタマイズ

### 占いメッセージの追加
`fortune_messages.json` の `messages` セクションに新しいメッセージを追加

### レシピの追加
`recipe.json` に新しいレシピオブジェクトを追加（IDは重複しないように）

### 語り巻の記事追加
対応する月の `articles_XXX.json` ファイルを編集

### 名言の追加
`quotes.json` に日付（MM-DD形式）をキーとして追加

## 注意事項

- **画像ファイル**：`assets/` ディレクトリに配置し、適切なパスで参照
- **文字コード**：すべてのファイルはUTF-8で保存
- **JSONの構文**：カンマの位置やクォートに注意（構文エラーは動作不良の原因）
- **ブラウザキャッシュ**：更新が反映されない場合は、ブラウザのキャッシュをクリア
- **CORS制限**：ローカルでの開発時は、簡易HTTPサーバーを使用推奨

## ローカル開発

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合
npx http-server

# その後、http://localhost:8000 でアクセス
```

## ライセンス

このプロジェクトは教育・学習目的で作成されています。商用利用の際は適切なライセンスを設定してください。

## トラブルシューティング

### JSONファイルが読み込まれない
- ファイル名とパスを確認
- JSONの構文エラーをチェック（[JSONLint](https://jsonlint.com/)等を使用）
- ブラウザの開発者ツールでエラーを確認

### GitHub Pagesで404エラー
- `.nojekyll` ファイルが存在することを確認
- リポジトリ設定でGitHub Pagesが有効になっているか確認
- ファイル名の大文字小文字を確認（GitHubは大文字小文字を区別）

### 占い結果が表示されない
- `fortune_messages.json` の構造を確認
- キャラクター名とカテゴリ名が正しく設定されているか確認

## 更新履歴

- v2.0.0：JSONベースのデータ構造に移行、七夜の語り巻を追加
- v1.0.0：初回リリース（CSVベース）

---

© 運命の銀竜暦 - エテルナリア世界観プロジェクト
