# Digital Rain

Claude デスクトップアプリ（Code タブ）の背景を、緑の文字が上から降り続ける画面にするダークテーマです。

- 48本の英数字の列（手前の大きい列と、奥の小さく暗い列）が、それぞれの速さで1文字ずつ落ちていきます。先頭の文字は白く光り、列の途中のいくつかの文字が数秒ごとに別の文字と入れ替わります
- 先頭の文字は白く明るく、後ろに行くほど濃い緑に沈みます
- 会話の文字が読みやすいよう、画面の中央の列は暗めにし、すりガラスも少し濃くしています
- 配色（黒に近い深緑と蛍光グリーン）と吹き出しの見た目もこのテーマで設定します

## 必要なもの

- Claude Code v2.1.323 以降と、mod の背景を描く Claude デスクトップアプリ
- Windows の「アニメーション効果」がオン（オフだと止まった画面になります）

## ほかのテーマとの切り替え

テーマはセッションの開始時に設定されるので、同時に有効にするのは1つだけにしてください。

```powershell
claude plugin disable galaxy-night@claude-desktop-themes
claude plugin enable digital-rain@claude-desktop-themes
```

## ファイル

- `hooks/register.tsx` — 配色・吹き出し・背景の設定
- `hooks/scene.ts` — 降ってくる文字の SVG（文字の種類 `GLYPHS`（英数字）、色 `SHADES`、列の数や速さはここ）
- `hooks/make-colors.js` — 配色を作る補助（Claude Code のスキルからコピー）
- `tests/backdrop.test.tsx` — 背景が描けるかのテスト

## 背景が止まってしまうとき

デスクトップアプリは、チカチカしすぎる背景や重すぎる背景を止めます。`scene.ts` で列を増やしたり速くしたりしたときに止まるようなら、列の数（`columns()` のループ回数）、1文字進む間隔（`perStep`）、先頭の明るさ（`SHADES`）を元に戻してください。
