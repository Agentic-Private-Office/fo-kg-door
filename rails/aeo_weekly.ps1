# familyofficeknowledgegraph.ai — weekly readiness scan (Sundays): scan -> record the score on facts.json (radar.readiness) -> deploy -> commit.
$ErrorActionPreference = "Stop"
$site = "C:\MATTHEWKEDDY\FO-KG\SITE"
Set-Location "$site\rails"
$log = "$site\rails\aeo\task.log"
"$(Get-Date -Format o) start" | Out-File -Append -Encoding utf8 $log
try {
  python "$site\rails\aeo_scan.py" --weekly --label weekly 2>&1 | Out-File -Append -Encoding utf8 $log
  Set-Location $site
  $env:CLOUDFLARE_API_TOKEN = (Get-Content "C:\ALLOOLOO\AGENT KEYS\cloudflare.txt" -Raw).Trim()
  $env:CLOUDFLARE_ACCOUNT_ID = "dd2832b36f171b815f84c8487aada36b"
  npx --yes wrangler deploy 2>&1 | Select-String -Pattern "Success|Uploaded fo-kg|ERROR" | Out-File -Append -Encoding utf8 $log
  python "C:\MATTHEWKEDDY\FO-KG\SITE\rails\mirror_door_repo.py" "roll: mirror door source ($(Get-Date -Format yyyy-MM-dd))" 2>&1 | Out-File -Append -Encoding utf8 $log   # public mirror github.com/Agentic-Private-Office/fo-kg-door (CEO ruling 2026-09-17)
  Remove-Item Env:CLOUDFLARE_API_TOKEN
  Set-Location "C:\MATTHEWKEDDY"
  git add FO-KG/SITE/public/facts.json FO-KG/SITE/rails/aeo START_ME_UP/BUILD-LOG.md | Out-Null
  git -c core.safecrlf=false commit -q -m "FO-KG weekly readiness scan $(Get-Date -Format yyyy-MM-dd)" 2>&1 | Out-File -Append -Encoding utf8 $log
  "$(Get-Date -Format o) done" | Out-File -Append -Encoding utf8 $log
} catch {
  "$(Get-Date -Format o) FAILED $($_.Exception.Message)" | Out-File -Append -Encoding utf8 $log
  exit 1
}
