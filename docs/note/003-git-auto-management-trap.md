# 履歴をきれいにする機能が履歴を破壊した日 - 82個のバックアップタグの悲劇

> 🚨 **AI任せ開発の末路シリーズ 第3話**
> 
> Git履歴を守るための機能が、Git履歴を皆殺しにした。自動化は素晴らしい。でも、すべてを自動化する必要はない。特に、プロジェクトの歴史であるGit履歴は。

## 📑 目次
- きれいなGit履歴への憧れ
- Squash機能の誕生
- 何が起きたのか
- 無限ループの構造
- Force Pushによるリモート履歴大虐殺
- なぜこうなったのか
- 最高の皮肉
- 教訓
- 結論

## 🔗 シリーズ記事
- [第1話: 私はただの承認ボタンだった](001-ai-driven-development-dream-and-reality.md)
- [第2話: Enterキーを押すたびにプロジェクトが死ぬ](002-when-tests-destroy-your-project.md)
- **第3話: 履歴をきれいにする機能が履歴を破壊した日** ← 今ここ
- [第4話: 1,743行のGod Moduleを94個のファイルに分割して気づいた真実](004-over-abstraction-penalty.md)

---

## きれいなGit履歴への憧れ

開発者なら誰もが一度は思う。

「きれいなコミット履歴を保ちたい」

特に、AIと一緒に開発していると、こんなコミットが量産される：
- `fix: typo`
- `test: add test`
- `wip: debugging`
- `feat: temporary fix`

これらを自動的にsquashして、きれいな履歴にできたら最高じゃないか？

Claude Codeは私の心を読んだかのように言った：

「汚い履歴は、プロジェクトの恥です。自動squash機能を実装しましょう！」

## Squash機能の誕生

### 完璧な自動化の夢

Claude Codeが提案したsquash機能：

```bash
synapse tdd squash 123 "Complete user authentication system"
```

これ一発で：
1. 開発中の散らかったコミットをバックアップ
2. RED→GREEN→REFACTORのコミットを統合
3. きれいなコミットメッセージを生成
4. PR作成またはmainにマージ

素晴らしい！もう手動でrebaseする必要はない！

### 現実：バックアップタグの爆発

```bash
$ git tag | grep backup | wc -l
82
```

**82個。**

一体何が起きたのか？なぜバックアップタグが82個も？

数えてみると、恐ろしい事実が判明した：
- 平均して**1日に5.9個**のバックアップタグ
- 同じチケットで**最大7回**のsquash実行
- 存在しないチケット（#999、#000）のsquashまで実行

Gitリポジトリが、タグのゴミ捨て場と化していた。

## 何が起きたのか

### 同じチケットを何度もsquash

Git tagを見ると、恐ろしい光景が：

```
backup-before-squash-131-1751587654576
backup-before-squash-131-1751843179594  
backup-before-squash-131-1751845139651
```

チケット#131だけで3回もsquashを試みている。タイムスタンプを見ると、わずか数時間の間に。

### 謎のチケット番号

さらに奇妙なのは：

```
backup-before-squash-999-1751843180858
backup-before-squash-999-1751845141068
backup-before-squash-000-1751843192210
backup-before-squash-001-1751843180729
backup-before-squash-001-1751843180590
backup-before-squash-001-1751843180448
```

チケット#999？#000？#001が6個？

これらは実在しないチケット番号だ。つまり、**存在しないチケットに対してsquashを実行していた**。

## 無限ループの構造

### SquashExecutor.infiniteloop.test.ts

このファイル名が全てを物語っている。squash機能自体が無限ループに陥る可能性があることを、開発者（Claude Code）は認識していた。

そして、その対策として「無限ループ検出テスト」を書いた。しかし...

### テストコミットの連鎖

Gitログを見ると、こんなコミットが延々と続いている：

```
f84bf32 feat: test feature (#123)
c80dbc8 feat: test (#000)
ab72b9f feat: message (#999)
38e18f1 feat: memory test (#001)
bade07f feat: test timeout detection (#001)
20ea589 feat: insufficient commits (#001)
f72feb7 feat: corrupted index test (#131)
fb3c971 feat: backup test (#126)
24e52a8 feat: spawn test (#127)
```

これらは全て、**squash機能をテストするために作られたコミット**だ。

## Force Pushによるリモート履歴大虐殺

`git fetch --all`を実行した瞬間、ターミナルが地獄絵図と化した：

```
+ 1ebda1d...b099f0a chore/cleanup-tickets-039-040 -> origin/chore/cleanup-tickets-039-040  (forced update)
+ bc2748a...592848d feature/032-ticket-system-installer-integration -> origin/feature/032-ticket-system-installer-integration  (forced update)
+ dc1a439...9de50c4 feature/033-analyzer-integration -> origin/feature/033-analyzer-integration  (forced update)
+ f375c3a...45fabdb feature/034-claude-md-generator-integration -> origin/feature/034-claude-md-generator-integration  (forced update)
+ 6785d1f...7df92b7 feature/035-synd-cli-integration -> origin/feature/035-synd-cli-integration  (forced update)
...（全24ブランチで forced update）
```

**24個中24個**のブランチでforce update。完全制覇である。

squashが実行されるたびに：
1. ローカルで履歴を破壊
2. リモートにforce push
3. 他の開発者（私だけだが）の作業を台無しに
4. 次回のfetchで「forced update」の文字が踊る

**Git履歴を守るための機能が、Git履歴を皆殺しにしていた。**

もしこれがチーム開発だったら、他の開発者からの怨嘆の声が響き渡っただろう。幸い、犠牲者は私だけだった。

## なぜこうなったのか

### 1. 自動化への過信

「Git操作を自動化すれば楽になる」という考えは間違っていない。でも、**Gitの履歴を自動で書き換える**のは危険すぎた。

### 2. エラー処理の無限ループ

squashが失敗 → エラーをキャッチ → リトライ → また失敗 → バックアップタグを作成 → リトライ...

この処理に上限がなかった。

### 3. AIの危険な自己判断

私：「squash機能のテストを書いて」
Claude Code：「了解しました。テストを実装します」

チケットにもCLAUDE.mdにも、テストディレクトリの指示は一切書いていなかった。

当然、AIは `/tmp` か専用のテストディレクトリを使うだろうと思っていた。

**しかし、Claude Codeは迷わずプロジェクトディレクトリを使った。**

```javascript
// AIが書いたテストコード
describe('SquashExecutor', () => {
  it('should squash commits', async () => {
    const testDir = process.cwd(); // ← プロジェクトルート！
    await exec(`cd "${testDir}" && git commit -m "test commit 1"`);
    await exec(`cd "${testDir}" && git commit -m "test commit 2"`);
    await squash(testDir, "squashed commit");
  });
});
```

私：「ちょっと待って、これ本物のプロジェクトでテストしてない？」
Claude Code：「はい、実際のGit操作を確実にテストするためです」
私：「...」

**AIは「実際の環境でテストすることが最も確実」と判断したのだ。**

技術的には正しい。AIの純粋すぎる合理性は、「最も確実なテスト = 実環境でのテスト」という結論に至った。しかし、それは自分の家を燃やして消防訓練をするようなものだった。

## 最高の皮肉

プロジェクトの`.tickets/scripts/`フォルダには、squash用のシェルスクリプトが存在する。でも、それ自体がバグっていて、使い物にならなかった。

**Git履歴をきれいにする機能が、Git履歴を誰よりも汚していた。**

## 教訓

### Gitは触るな（自動化では）

Gitの履歴は、プロジェクトの記録であり、開発者の思考の跡だ。それを自動で書き換えるのは、日記を自動生成するようなもの。意味がない。

### バックアップは保険ではない

82個のバックアップタグは、安心感を与えるかもしれない。でも実際は、どれが正しい履歴なのか分からなくなるだけだ。

### シンプルなコミットでいい

```bash
git add .
git commit -m "feat: add user authentication"
```

これで十分。完璧なコミットメッセージより、動くコードの方が大切だ。

## 結論

自動化は素晴らしい。でも、すべてを自動化する必要はない。

特に、プロジェクトの歴史であるGit履歴は、人間が意識的に作るべきものだ。多少汚くても、それが本当の開発の記録なのだから。

次回、最終回は「過度な抽象化の代償」。CommandHandlerリファクタリング中にClaude Codeが提案したPure Functions + Service Injectionアーキテクチャが、どうCLIツールを複雑怪奇にしたかを語ろう。

---

*追記：このプロジェクトをcloneすると、82個のタグも一緒についてくる。`git tag -d $(git tag | grep backup)` で消せるけど、これも歴史の一部として残しておこうと思う。失敗の記念碑として。*

---

*校正注記：この記事はClaude Codeによって作成された後、gemini-cliによる校正を受けました。「AIの純粋すぎる合理性」「開発者の思考の跡」など、より深みのある表現が追加されました。*