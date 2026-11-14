# Step 1 of the AC_PLUS import: reads a COPY of AC_PLUS's ACMPNM.mdb (read-only)
# and writes one JSON-lines file per table. See scripts/acplus/README.md.
param(
  [Parameter(Mandatory = $true)][string]$Mdb,     # path to a copy of ACMPNM.mdb
  [Parameter(Mandatory = $true)][string]$OutDir   # folder for the .jsonl files
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web
New-Item -ItemType Directory -Force $OutDir | Out-Null

$tables = 'COMPANY','AGGRP','AGMAS','ABMAS','ADCIT','ADSTA','ATMAS','AFMAS','ASMAS',
          'ADSRE','ACPRE','ADCHL','AXTRA','AFTRA','ASTRA','AGTRA'

$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$Mdb;Mode=Read")
$conn.Open()
try {
  foreach ($t in $tables) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = "SELECT * FROM [$t]"
    $r = $cmd.ExecuteReader()
    $w = New-Object System.IO.StreamWriter((Join-Path $OutDir "$t.jsonl"), $false, (New-Object System.Text.UTF8Encoding($false)))
    $n = 0
    while ($r.Read()) {
      $parts = for ($i = 0; $i -lt $r.FieldCount; $i++) {
        $v = $r.GetValue($i)
        $j = if ($v -is [DBNull]) { 'null' }
             elseif ($v -is [DateTime]) { '"' + $v.ToString('yyyy-MM-dd') + '"' }
             elseif ($v -is [bool]) { if ($v) { 'true' } else { 'false' } }
             elseif ($v -is [ValueType]) { [Convert]::ToString($v, [Globalization.CultureInfo]::InvariantCulture) }
             else { '"' + [System.Web.HttpUtility]::JavaScriptStringEncode([string]$v) + '"' }
        '"' + $r.GetName($i) + '":' + $j
      }
      $w.WriteLine('{' + ($parts -join ',') + '}'); $n++
    }
    $w.Close(); $r.Close()
    Write-Host "$t`t$n rows"
  }
} finally { $conn.Close() }
