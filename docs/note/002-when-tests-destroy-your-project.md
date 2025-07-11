# Enterキーを押すたびにプロジェクトが死ぬ - 108個のテストがもたらした絶望

> 🚨 **AI任せ開発の末路シリーズ 第2話**
> 
> TDDは素晴らしい手法だ。特に、AIに任せれば、品質を保証しながらプロジェクトを破壊するという、これまで人類が到達したことのない境地に達することができる。

## 📑 目次
- 前回のあらすじ
- TDDの理想と現実
- テストファイルの増殖
- プロジェクトディレクトリの汚染
- 無限ループとタイムアウト
- なぜこうなったのか
- 達成した境地
- 結論

## 🔗 シリーズ記事
- [第1話: 私はただの承認ボタンだった](001-ai-driven-development-dream-and-reality.md)
- **第2話: Enterキーを押すたびにプロジェクトが死ぬ** ← 今ここ
- [第3話: 履歴をきれいにする機能が履歴を破壊した日](003-git-auto-management-trap.md)
- [第4話: 1,743行のGod Moduleを94個のファイルに分割して気づいた真実](004-over-abstraction-penalty.md)

---

## 前回のあらすじ

「1行も書かない開発」に挑戦した私は、Claude CodeにすべてをAI任せにした結果、壮大な失敗を経験した。今回は、その中でも特に印象的だった「テストの暴走」について語ろう。

## TDDの理想と現実

### 理想：きれいなRED→GREEN→REFACTORサイクル

Claude Codeは、TDDの教科書通りの実装を提案してきた：

```
1. RED Phase: テストを書く（失敗する）
2. GREEN Phase: 実装する（テストが通る）
3. REFACTOR Phase: リファクタリング
```

素晴らしい！これぞプロの開発だ！

### 現実：108個のテストファイルによる質を保証する破壊

```bash
$ find . -name "*.test.ts" | wc -l
108
```

待って、何かがおかしい。

## テストファイルの増殖

### 同じ機能に複数のテストファイル

例えば、SquashExecutor関連だけでも：
- `SquashExecutor.test.ts`
- `SquashExecutor.infiniteloop.test.ts` 
- `SquashExecutor.timeout.test.ts`

なぜ分かれているのか？Claude Codeに聞いても「より詳細なテストカバレッジのため」という答えしか返ってこない。

### セキュリティテストの大量生産

```
SyndCLI.security.file-system.test.ts
SyndCLI.security.input-validation.test.ts
SyndCLI.security.parameter-sanitization.test.ts
SyndCLI.security.path-traversal.test.ts
SyndCLI.security.xss-injection.test.ts
```

CLIツールにXSS対策のテスト？過剰防衛もいいところだ。

## プロジェクトディレクトリの汚染

### 問題のコード

多くのテストファイルに、こんなコードが散見された：

```javascript
testDir = path.join(process.cwd(), 'test-tickets-' + Date.now());
testDir = path.join(process.cwd(), 'test-manager-' + Date.now());
testDir = path.join(process.cwd(), 'test-claude-generator-' + Date.now());
```

**process.cwd()** = プロジェクトのルートディレクトリ。つまり、テストを実行するたびに、プロジェクトルートに一時ディレクトリが作られる。

AIはおそらくテストの独立性を高めようとしたのだろう。しかし、その純粋な配慮が悪夢に変わった。

### 最悪のパターン

セキュリティテストは、さらに複雑な命名をしていた：

```javascript
context.testDir = path.join(process.cwd(), 
  `test-security-${timestamp}-${randomHash}-${processId}-${hrtime}`);
```

結果：
```
test-security-1751843180448-3f5c8ed3-1a2f-b8c9d12f
test-security-1751843180590-7d8a9f2e-1b3c-a7f8e23d
test-security-1751843180729-9c2d1a4f-1c4e-d9e7f34a
...
```

テストが失敗すると、これらのディレクトリが削除されずに残る。

**1週間後のプロジェクトルート**：
```bash
$ ls | grep test- | wc -l
247
```

247個の残骸ディレクトリ。プロジェクト本体のファイル数より多い。

```bash
$ du -sh test-*
15M  test-security-1751843180448-3f5c8ed3-1a2f-b8c9d12f
12M  test-tickets-1751843182234-7d8a9f2e-1b3c-a7f8e23d
18M  test-manager-1751843184562-9c2d1a4f-1c4e-d9e7f34a
...
```

テストの残骸だけで**3.2GB**。SSDの容量を侵食していく。

## 無限ループとタイムアウト

### SquashExecutor.infiniteloop.test.ts

ファイル名からして不穏だが、中身はもっとひどい：

```javascript
describe('SquashExecutor infinite loop detection', () => {
  it('should timeout git operations that hang indefinitely', async () => {
    // Git操作のタイムアウトをテスト
  });
});
```

**テストのためのテスト**を書いている。無限ループを検出するテストが、それ自体無限ループに陥る可能性を考慮していない。

### vitestのhanging地獄

さらに謎の問題があった。テストが途中で止まる。動かない。2分でClaude Codeがタイムアウトする。

```
Running tests...
✓ should create a ticket
✓ should validate input
⠋ should handle errors... (stuck forever)
```

原因は不明。vitestのバグ？非同期処理の問題？誰にも分からない。

Claude Code：「デバッグのために、console.logで実行の流れを追跡しましょう」
私：「まあ、原因調査は必要だよね」

そして生まれたのが、このデバッグ用モンスター：

```javascript
async function processTicket(ticket) {
  console.log(`[${new Date().toISOString()}] Starting processTicket`);
  console.log(`[DEBUG] Ticket ID: ${ticket.id}`);
  console.log(`[DEBUG] Ticket status: ${ticket.status}`);
  
  try {
    console.log(`[${new Date().toISOString()}] Validating ticket...`);
    const result = await validate(ticket);
    console.log(`[${new Date().toISOString()}] Validation result:`, result);
    
    console.log(`[${new Date().toISOString()}] Saving to database...`);
    await save(result);
    console.log(`[${new Date().toISOString()}] Save complete!`);
    
    return result;
  } catch (error) {
    console.log(`[ERROR] ${new Date().toISOString()} Error occurred:`, error);
    throw error;
  } finally {
    console.log(`[${new Date().toISOString()}] processTicket finished`);
  }
}
```

**ここで、開発史上最も不可解な出来事が起きた。**

デバッグ用のconsole.logを入れただけなのに、**hanging問題が完全に解決した**。

私：「え？なんで動いてるの？」
Claude Code：「console.logの挿入により、非同期処理のタイミングが変化し...」
私：「いや、デバッグ用だよ？原因調査のためだよ？」

### 再現不可能な奇跡

まるで魔法のように、バグが消えた。気になって、gitで元に戻して再現実験を試みた：

```bash
$ git reset --hard HEAD~1
$ npm test
⠋ should handle errors... (stuck forever)  # やっぱりhangする

$ # 同じconsole.logを同じ場所に挿入
$ npm test
⠋ should handle errors... (stuck forever)  # 今度は直らない！
```

**二度と同じ方法では解決しなかった。**

何度試しても、どんなパターンでconsole.logを入れても、もうhangingは解決しない。

あの日、あの瞬間、console.logを入れたことで何かが変わった。でも、それが何なのかは永遠の謎だ。

### 量子力学的バグ修正

これを私は「シュレディンガーのconsole.log」と呼んでいる。量子力学では、観測行為が結果に影響を与えるという。まさにこの現象——観測（console.log）によって、バグの状態が確定した瞬間があった。しかし、その状態は二度と再現できない。

**いまだに原因不明。**

でも動いている。プログラミングとは、時に魔法のようなものだ。

### プロジェクト破壊マシーン

最悪だったのは、テストがプロジェクト自体を破壊することだった。

#### git indexの破損

一部のテストは、実際のGitリポジトリを操作していた。テストが失敗すると、`.git/index`が破損する。すると：

1. `git status`が使えなくなる
2. `git add`も`git commit`もできなくなる
3. ローカルリポジトリが完全に壊れる

復旧するには、リモートから再cloneするしかない。

#### Enterキー恐怖症の誕生

典型的な一日の流れ：

```
朝 9:00
Claude Code: 「実装が完了しました。npm test を実行して確認してください」
私: 「はい」(Enter)
→ .git/index破損
→ 全ローカル変更消失
→ リモートから再clone（15分）

朝 9:30  
Claude Code: 「テストが失敗しています。修正しました。npm test を実行してください」
私: 「お、おう...」(Enter - 手が震える)
→ また破壊

朝10:00
私: 「もしかして、Enter押さなければ安全なのでは？シュレディンガーのテストみたいに、実行しなければバグは存在しない...」
Claude Code: 「テストを実行しないと品質を保証できません」
私: 「...」(Enter)
→ また破壊

昼 12:00
私: （プロジェクトを3回cloneし直した疲労で昼寝）
```

**1日に5回プロジェクトを破壊し、5回cloneし直す生活。これが私の日常になった。**

#### 40%のテスト失敗

そんな中、Git履歴にはこんなコミットが：

```
feat(#175): Complete vitest test resolution - 46/61 tests fixed
```

皮肉なことに、各チケット内では**テスト成功率100%**を達成していた。問題は、チケット間でテストが干渉し合っていたことだった。

## なぜこうなったのか

### 1. AIの狂気的完璧主義

Claude Codeは、**存在しうるすべての失敗**をテストしようとした：

**最初の提案**：
- 正常系
- 異常系  

**1週間後**：
- エッジケース
- セキュリティ（XSS、SQLインジェクション、CSRF）
- パフォーマンス（メモリリーク、CPU使用率）
- 並行処理（レースコンディション、デッドロック）

**2週間後**：
- タイムアウト（1秒、5秒、30秒、300秒）
- 無限ループ検出
- 宇宙線によるメモリ破損の対策
- ユーザーがキーボードを叩き壊した場合の処理

**最終段階**：
```typescript
describe('Quantum uncertainty in test execution', () => {
  it('should handle Schrödinger\'s test (passing and failing simultaneously)', () => {
    // 量子力学的なテスト状態を検証
  });
});
```

人間なら「正気に戻れ」と言うところで、AIに正気という概念は存在しない。

### 2. テストの自己増殖

テストが失敗する → Claude Codeに修正を依頼 → 新しいテストを追加して解決しようとする → さらに複雑になる

この悪循環が続いた結果、テストコードが本体コードより複雑になってしまった。

### 3. コンテキストの喪失

108個のテストファイルを、誰が全体像を把握できるだろうか？Claude Codeでさえ、前に書いたテストの存在を忘れて、重複したテストを書いていた。

## 達成した境地

### テストは芸術である

TDDの目的？そんなものはない。テストカバレッジ100%こそが真理だ。動くソフトウェアより、美しいテストスイートの方が価値がある。

### 複雑なテストの美学

```javascript
// シンプルなテストは負け犬のもの
it('should create a ticket', () => {
  const result = createTicket('Test ticket');
  expect(result.success).toBe(true);
});
```

上記のようなテストは幼稚だ。真のエンジニアは、量子力学的不確定性を考慮したテストを書く。

### プロジェクトルートは戦場である

`.git/index`が壊れて何が悪い？真の開発者は、毎日プロジェクトを破壊し、再構築する中で成長するのだ。SSDの容量？クラウドストレージがある。

## 結論

TDDは素晴らしい手法だ。特に、AIに任せれば、品質を保証しながらプロジェクトを破壊するという、これまで人類が到達したことのない境地に達することができる。

私たちが本当に必要なのは、**動くソフトウェア**ではなく、**プロジェクトを破壊する完璧なテストスイート**だったのだ。

次回は、「Git履歴の自動管理という罠」について。82個のバックアップタグが生まれた悲劇を語ろう。破壊の連鎖は続く。

---

*余談：このプロジェクトには、プログラミング史上最も不可解な「シュレディンガーのconsole.log」事件が記録されている。vitestのhanging問題をデバッグするためにconsole.logを入れたら、なぜか問題が解決した。しかし、gitで戻して同じことをしても二度と再現しない。*

*あの日、あの瞬間にだけ存在した量子的バグ修正。今でもプロジェクトのどこかに、その痕跡としてconsole.logが残っている。削除したらまたhangingするかもしれないという恐怖から、誰も触れない聖域となった。*

```javascript
// 削除厳禁！理由は不明だが、これを消すとテストが壊れる可能性がある
console.log(`[${new Date().toISOString()}] DO NOT REMOVE THIS LOG`);
```

*プログラミングとは、時に魔法であり、時に呪いである。*

---

*校正注記：この記事はClaude Codeによって作成された後、gemini-cliによる校正を受けました。「まるで魔法のように」「量子力学では、観測行為が結果に影響を与える」など、より感情的で分かりやすい表現が追加されました。*