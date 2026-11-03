---
title: 'Error handling in PowerShell that actually holds up'
description: 'Terminating versus non-terminating errors, try/catch, ErrorAction, and the patterns that keep automation from failing silently.'
pubDate: 2026-07-22
tags: ['powershell', 'errors', 'automation']
---

PowerShell will happily continue after a failure. That is convenient in an interactive shell and dangerous in an automation script. The difference between the two is understanding how errors propagate — and choosing deliberately.

## Terminating and non-terminating errors

PowerShell has two broad error categories:

- **Non-terminating errors** report a problem and continue. `Get-ChildItem` on a folder with an access-denied subfolder is a common example.
- **Terminating errors** stop the current statement or pipeline. A syntax error, a `throw`, or a cmdlet failure with `-ErrorAction Stop` are examples.

`try/catch` only catches terminating errors. This is the single most important fact about PowerShell error handling:

```powershell
try {
    Get-ChildItem C:\Restricted -ErrorAction Stop
}
catch {
    Write-Warning "Could not read the folder: $($_.Exception.Message)"
}
```

Without `-ErrorAction Stop`, the non-terminating error would print and the `catch` block would never run.

## Set the default for the script, not the session

At the top of an automation script:

```powershell
$ErrorActionPreference = 'Stop'
```

This promotes non-terminating errors to terminating ones, which makes `try/catch` reliable. Set it in the script scope, not globally, so you do not surprise interactive users who dot-source your file.

You can still relax it for a specific command:

```powershell
Get-ChildItem C:\Temp -ErrorAction SilentlyContinue
```

Use `SilentlyContinue` only when the failure is genuinely expected and you handle the aftermath.

## Catch the right error

A `catch` block receives an `ErrorRecord` in `$_`. Useful properties:

```powershell
try {
    Get-Item C:\missing.txt -ErrorAction Stop
}
catch {
    $_.Exception.GetType().FullName   # System.Management.Automation.ItemNotFoundException
    $_.CategoryInfo.Category          # ObjectNotFound
    $_.TargetObject                   # C:\missing.txt
    $_.Exception.Message
}
```

Catch specific exception types when the distinction matters:

```powershell
try {
    $response = Invoke-RestMethod -Uri $url -ErrorAction Stop
}
catch [System.Net.Http.HttpRequestException] {
    Write-Warning "Network failure: $($_.Exception.Message)"
}
catch {
    throw
}
```

A bare `throw` inside `catch` rethrows the original error and preserves the call stack. Do not wrap everything in a generic message and lose the original detail.

## Use finally for cleanup

`finally` runs whether or not the `try` block succeeded:

```powershell
$client = [System.Net.Http.HttpClient]::new()
try {
    $result = $client.GetStringAsync($url).GetAwaiter().GetResult()
}
catch {
    Write-Error "Request failed: $($_.Exception.Message)"
}
finally {
    $client.Dispose()
}
```

This is the right place to dispose connections, remove temporary files, or restore state. Cleanup should not depend on success.

## Validate inputs before the work

Fail early with a clear message:

```powershell
param(
    [Parameter(Mandatory)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$ConfigPath
)
```

`ValidateScript` runs before the function body and produces a readable error. For complex checks, throw explicitly:

```powershell
if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Config file not found: $ConfigPath"
}
```

A deliberate `throw` with a specific message is easier to diagnose than a downstream cmdlet complaining about `$null`.

## Exit codes matter in automation

When a script is called by Task Scheduler, a CI runner, or another process, the exit code is the contract:

```powershell
try {
    Invoke-MainWork -ErrorAction Stop
    exit 0
}
catch {
    Write-Error $_
    exit 1
}
```

Do not rely on the last command's success. Set the exit code explicitly at the boundaries.

## Do not swallow errors

These patterns hide failures:

```powershell
# Bad: a failure disappears
try { Do-Something } catch { }

# Bad: catches everything, reports nothing useful
try { Do-Something } catch { Write-Host "Something went wrong" }
```

If a failure is acceptable, say so and explain why. If it is not, let it propagate or log it with context.

## A logging helper

For scripts that must leave a trail:

```powershell
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR')]
        [string]$Level = 'INFO'
    )

    $line = '{0:o} [{1}] {2}' -f (Get-Date), $Level, $Message
    Add-Content -LiteralPath $script:LogPath -Value $line

    if ($Level -eq 'ERROR') { Write-Error $Message }
    else { Write-Verbose $Message }
}
```

Keep log formatting in one place. Scattered `Write-Host` calls produce output that is hard to parse and impossible to redirect.

## The checklist

- Use `try/catch` around operations that can fail.
- Add `-ErrorAction Stop` where a cmdlet emits non-terminating errors.
- Set `$ErrorActionPreference = 'Stop'` at script scope for automation.
- Catch specific exception types when behavior differs.
- Use `finally` for cleanup.
- Set explicit exit codes.
- Never leave an empty catch block.

Error handling is not decoration. It is the difference between a script that reports what happened and one that quietly claims success.
