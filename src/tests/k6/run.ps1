# يشغّل سكريبت k6 مع تحميل المتغيرات من tests/k6/.env كـ -e KEY=value —
# بديل عن --env-file (غير مدعوم في إصدارات k6 الأقدم من v0.49).
#
# الاستخدام:
#   .\tests\k6\run.ps1 tests\k6\scenarios\01-shifts-list-calendar.js
#   .\tests\k6\run.ps1 tests\k6\scenarios\02-create-shift.js -VUS 50 -Duration 3m
#
# أي متغير تمرّره عبر -VUS/-Duration يطغى على القيمة الموجودة في .env.

param(
    [Parameter(Mandatory = $true)]
    [string]$Script,

    [string]$EnvFile = "$PSScriptRoot\.env",

    [string]$VUS,

    [string]$Duration
)

if (-not (Test-Path $EnvFile)) {
    Write-Error "ملف البيئة غير موجود: $EnvFile — انسخ .env.example إلى .env أولاً."
    exit 1
}

$envArgs = @()
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    $envArgs += '-e'
    $envArgs += "$key=$value"
}

if ($VUS) { $envArgs += '-e'; $envArgs += "VUS=$VUS" }
if ($Duration) { $envArgs += '-e'; $envArgs += "DURATION=$Duration" }

& k6 run @envArgs $Script
exit $LASTEXITCODE
