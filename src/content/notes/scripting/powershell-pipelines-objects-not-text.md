---
title: 'PowerShell pipelines: objects, not text'
description: 'Why PowerShell pipes objects instead of strings, and how that one idea makes filtering, sorting, and formatting click.'
pubDate: 2026-10-28
tags: ['powershell', 'pipelines', 'automation']
---

Most shells treat a pipeline as a stream of text. PowerShell treats it as a stream of **objects**. That single design choice is the reason a PowerShell one-liner can filter processes by memory, sort them, and export a CSV without parsing a single column.

If pipelines have ever felt unpredictable, it is usually because you were thinking in text while PowerShell was thinking in objects.

## The pipeline moves objects

Consider a familiar command:

```powershell
Get-Process | Where-Object { $_.WorkingSet64 -gt 500MB } | Sort-Object WorkingSet64 -Descending
```

Read the pipes as "and then pass the whole object along":

1. `Get-Process` returns `System.Diagnostics.Process` objects.
2. `Where-Object` receives each object and evaluates a condition against its properties.
3. `Sort-Object` receives the surviving objects and sorts by the numeric `WorkingSet64` property.

At no point does PowerShell convert the process list into a table of text. `WorkingSet64` remains a number. That is why `-gt 500MB` works — `500MB` is a numeric literal, not a string comparison.

You can prove the type at any point:

```powershell
(Get-Process -Name pwsh).GetType().FullName
# System.Diagnostics.Process
```

## `$_` is the current object

Inside a pipeline, `$_` (also written `$PSItem`) refers to the object currently flowing through. The script block in `Where-Object` runs once per object:

```powershell
Get-Service | Where-Object { $_.Status -eq 'Running' -and $_.StartType -eq 'Automatic' }
```

The same object is available to `ForEach-Object`:

```powershell
Get-ChildItem -File | ForEach-Object {
    [pscustomobject]@{
        Name = $_.Name
        Kilobytes = [math]::Round($_.Length / 1KB, 1)
    }
}
```

Notice that the output is a new object with chosen properties. It is not a formatted string. Downstream commands can still sort, filter, or export it.

## Formatting belongs at the end

This is the most common pipeline mistake:

```powershell
# Avoid: formatting breaks the objects
Get-Process | Format-Table Name, CPU | Where-Object { $_.CPU -gt 10 }
```

`Format-Table` produces formatting objects, not process objects. The `CPU` property you expected is gone, and filtering silently stops working the way you intended.

The rule is simple: **format last**, and only when you are about to display something.

```powershell
Get-Process |
    Where-Object { $_.CPU -gt 10 } |
    Sort-Object CPU -Descending |
    Select-Object -First 10 Name, CPU, Id |
    Format-Table -AutoSize
```

`Select-Object` is the better tool for narrowing columns because it returns objects with only those properties. `Format-Table` is for humans, not for the rest of the pipeline.

## Property names matter more than output

Because commands return objects, the reliable way to use PowerShell is to discover property names:

```powershell
Get-Service | Get-Member
Get-Process | Select-Object -First 1 | Format-List *
```

`Get-Member` tells you the type and every property and method available. Once you know a property exists, the pipeline becomes straightforward:

```powershell
Get-Service | Where-Object Status -EQ 'Stopped'
Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 5
```

Newer PowerShell versions allow simplified syntax for `Where-Object` when comparing a single property. Use whichever is clearer to you.

## Filter early, format late

Performance follows the same rule. Filter as close to the source as possible so fewer objects travel down the pipe:

```powershell
# Better: the source does the heavy filtering
Get-ChildItem -Path C:\Logs -Filter *.log -File |
    Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) |
    Select-Object FullName, Length, LastWriteTime
```

`-Filter` is handled by the provider and is usually faster than `Where-Object`. `Where-Object` is the flexible option for conditions the provider cannot express.

## A useful pattern: enrich, then export

Because objects stay objects, you can add calculated properties and export structured data:

```powershell
Get-ChildItem -Path C:\Apps -Directory |
    ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
            Measure-Object Length -Sum).Sum

        [pscustomobject]@{
            Folder = $_.Name
            SizeMB = [math]::Round($size / 1MB, 1)
            Modified = $_.LastWriteTime
        }
    } |
    Sort-Object SizeMB -Descending |
    Export-Csv -Path .\folder-sizes.csv -NoTypeInformation
```

No text parsing, no column counting, no fragile splitting. Each stage receives the same structured shape.

## The mental model to keep

- A pipeline passes **objects**, not lines of text.
- Use `Get-Member` to learn the object's properties.
- Use `Select-Object` to shape objects; use `Format-Table` only for display.
- Filter early, sort when needed, export structured data at the end.

Once that model sticks, long PowerShell commands stop looking like magic. They become a sequence of small, predictable transformations — which is exactly what a good script should be.
