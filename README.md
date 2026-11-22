# Claude Desktop Themes

Claude デスクトップアプリ（Code タブ）の見た目を変える mod テーマ集です。会話の後ろに動く背景を描き、配色と吹き出しも変えます。

| テーマ | 内容 |
| --- | --- |
| `galaxy-night` | 立体ブロックで描いた宇宙。太陽、地球と月、輪のある惑星、ブラックホール、渦巻き銀河、星雲、彗星がゆっくり動きます |
| `digital-rain` | 黒い画面を緑の英数字の列が上から降り続けます |

## インストール

ターミナルで Claude Code を起動し、プロンプトに次を入力します（`y` でマーケットプレイスを追加し、スコープは user を選びます）。

```
/plugin install galaxy-night --marketplace konnnyakuimo2000/claude-desktop-themes
```

```
/plugin install digital-rain --marketplace konnnyakuimo2000/claude-desktop-themes
```

シェルからは次のとおりです。

```
claude plugin install galaxy-night --marketplace konnnyakuimo2000/claude-desktop-themes
```

デスクトップアプリでは `/plugin` が使えないので、プロンプト欄の横の + から Plugins を開き、Add marketplace に `konnnyakuimo2000/claude-desktop-themes` を入れてから Add plugin でテーマを選びます。

ターミナルからユーザースコープで入れたテーマは、デスクトップアプリの Code タブのセッションにも読み込まれます。

## テーマの切り替え

テーマはセッションの開始時に設定されるので、有効にするのは1つだけにしてください。

```
claude plugin disable galaxy-night@claude-desktop-themes
claude plugin enable digital-rain@claude-desktop-themes
```

## 必要なもの

- Claude Code v2.1.323 以降と、mod の背景を描く Claude デスクトップアプリ
- OS の「アニメーション効果」（動きを減らす設定）がオフになっていないこと。動きを減らす設定のときは止まった絵で表示されます

各テーマの詳しい内容は `mods/<テーマ名>/README.md` にあります。
