---
title: 'Build a reusable PowerShell network scan script'
description: 'Turn ad-hoc ping and port checks into a parameterized, object-producing script you can reuse and pipe into other tools.'
pubDate: 2026-09-18
tags: ['powershell', 'networking', 'scripting']
---

The quickest way to check a host is to type `Test-Connection` and move on. The problem is that the quickest way is rarely reusable. A scan you can run, export, and build on needs three things: parameters, structured output, and predictable error handling.

## Start with the inputs

A useful host scan needs a target range, a timeout, and an optional set of ports. Put those in a parameter block:

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Target,

    [int]$TimeoutMs = 800,

    [int[]]$Port = @(22, 80, 443, 3389)
)
```

`[CmdletBinding()]` turns the script into an advanced script, which gives you `-Verbose`, `-ErrorAction`, and consistent parameter behavior. `[Parameter(Mandatory)]` makes the intent explicit.

## Resolve the target once

Handle both a single host and a comma-separated list. Split, trim, and keep only non-empty values:

```powershell
$targets = $Target.Split(',') |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }
```

If you want CIDR support, `Test-Connection` will not expand it for you. Keep the script honest: accept hostnames and single addresses, and leave range expansion to a tool such as `Nmap` unless you are prepared to write the arithmetic.

## Probe with a real timeout

`Test-Connection` in PowerShell 7 supports `-TimeoutSeconds`, but it is whole seconds. A TCP connection attempt is often a better reachability signal anyway, because ICMP is frequently blocked.

```powershell
function Test-TcpPort {
    param(
        [string]$ComputerName,
        [int]$Port,
        [int]$TimeoutMs
    )

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync($ComputerName, $Port)
        if ($task.Wait($TimeoutMs)) {
            return $client.Connected
        }
        return $false
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}
```

`ConnectAsync` plus `Wait` gives millisecond control and does not throw for a refused connection. A refused port means the host answered, which is useful information on its own.

## Emit objects, not formatted text

A script that writes strings is a dead end. Emit one object per target and let the caller decide how to display it:

```powershell
foreach ($name in $targets) {
    $address = $null
    $resolved = $true

    try {
        $address = [System.Net.Dns]::GetHostAddresses($name) |
            Where-Object AddressFamily -eq 'InterNetwork' |
            Select-Object -First 1 -ExpandProperty IPAddressToString
    }
    catch {
        $resolved = $false
    }

    $openPorts = @()
    if ($resolved) {
        foreach ($p in $Port) {
            if (Test-TcpPort -ComputerName $address -Port $p -TimeoutMs $TimeoutMs) {
                $openPorts += $p
            }
        }
    }

    [pscustomobject]@{
        Name      = $name
        Address   = $address
        Resolved  = $resolved
        OpenPorts = $openPorts -join ','
        Reachable = ($openPorts.Count -gt 0)
    }
}
```

Now the output is data. You can sort it, convert it to JSON, or compare runs:

```powershell
.\Invoke-HostScan.ps1 -Target web01,db01,10.0.0.10 -Port 22,443 |
    Format-Table -AutoSize

.\Invoke-HostScan.ps1 -Target web01,db01 -Port 22,443 |
    Export-Csv .\scan.csv -NoTypeInformation
```

## Handle the resolution edge cases

`GetHostAddresses` can return IPv6 first. Filter to IPv4 explicitly if that is what your downstream checks expect. It can also return multiple addresses; pick one deliberately rather than relying on array position.

For a name that resolves to several addresses, a more advanced version loops over each address and reports one row per address. That is often what you want when troubleshooting load-balanced services.

## Be careful with concurrency

The loop above scans ports sequentially. That is fine for a handful of hosts and a handful of ports. At scale, use `ForEach-Object -Parallel` in PowerShell 7:

```powershell
$Port | ForEach-Object -Parallel {
    [pscustomobject]@{
        Port = $_
        Open = Test-TcpPort -ComputerName $using:address -Port $_ -TimeoutMs $using:TimeoutMs
    }
} -ThrottleLimit 20
```

`$using:` is required to read variables from the outer scope inside a parallel block. Keep the throttle limit modest; a scan that saturates a link or triggers intrusion detection is not a successful scan.

## Add verbose logging without polluting output

Send progress messages to the verbose stream:

```powershell
Write-Verbose "Scanning $name ($address)"
```

Run with `-Verbose` when you need to see them. Do not use `Write-Host` for diagnostics; it cannot be redirected cleanly and it makes the script harder to compose.

## The shape of a good script

- Parameters for anything a caller might change.
- A small, testable function for the low-level probe.
- Structured objects as output.
- Errors handled locally so one bad host does not kill the run.
- No formatting and no `Write-Host`.

That shape is independent of this particular scan. Once you start writing probes this way, the next script — certificate checks, API health checks, DNS consistency — follows the same pattern.

A responsible note: only scan systems you own or have explicit permission to test. Reachability checks are simple, but authorization is still the first requirement.
