# 運命の銀竜暦

## 使い方
1. このリポジトリを GitHub にプッシュします。
2. `index.html` と同じ階層に `fortune_messages.csv`（占いメッセージCSV）を配置します。
3. GitHub Pages を有効化すれば、そのまま動作します。

## ファイル構成
- index.html … 占いコアのフロントエンド
- fortune_messages.csv … 占いデータ（カテゴリ×星評価×キャラ×メッセージ）
- README.md … この説明ファイル
- .nojekyll … GitHub Pages 用（ルートでそのまま動かすため）

## 注意
- GitHub Pages で動かす場合、CSV の相対パスに注意してください。
- 有料判定は本番環境のサーバ側（キャリア決済完了後）で制御してください。
