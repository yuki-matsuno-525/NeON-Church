#!/usr/bin/env bash
# git push 後に GitHub Actions を監視する PostToolUse フック。
#
# 成功時 : 何も出力せず exit 0（静かに終わる）
# 失敗時 : 失敗ログの末尾を出力して exit 2（Claude に差し戻す）
# gh が無い / run が見つからない場合も exit 0 で素通りする。
#
# WSL・Git Bash の両方で動くよう、gh は PATH → Windows 版の順に探す。
set -u

find_gh() {
  if command -v gh >/dev/null 2>&1; then
    command -v gh
    return
  fi
  for candidate in \
    "/mnt/c/Program Files/GitHub CLI/gh.exe" \
    "/c/Program Files/GitHub CLI/gh.exe" \
    "/mnt/c/Program Files (x86)/GitHub CLI/gh.exe"; do
    if [ -x "$candidate" ]; then
      printf '%s' "$candidate"
      return
    fi
  done
}

GH="$(find_gh)"
[ -n "$GH" ] || exit 0

# Windows 版 gh を WSL から呼ぶとリポジトリ自動判定に失敗するため、
# origin の URL から owner/repo を取り出して -R で明示する。
REPO="$(git remote get-url origin 2>/dev/null \
  | sed -E 's#^(git@[^:]+:|https?://[^/]+/)##; s#\.git$##')"
[ -n "$REPO" ] || exit 0

# push が GitHub に届いてワークフローが登録されるまで待つ
sleep 5

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [ -n "$branch" ] && [ "$branch" != "HEAD" ]; then
  run_id="$("$GH" run list -R "$REPO" --branch "$branch" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
else
  run_id="$("$GH" run list -R "$REPO" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
fi
[ -n "$run_id" ] || exit 0

if "$GH" run watch -R "$REPO" "$run_id" --exit-status >/dev/null 2>&1; then
  exit 0
fi

echo "GitHub Actions が失敗しました (run #$run_id):"
"$GH" run view -R "$REPO" "$run_id" --log-failed 2>/dev/null | tail -80
exit 2
