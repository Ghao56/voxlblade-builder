# Reverse the CP1258 (ANSI) round-trip damage from Get-Content/Set-Content splice.
# Per non-ASCII run: encode back via CP1258, keep only if strictly valid UTF-8.
param([string]$Path = 'src\App.svelte')
$utf8 = [System.Text.UTF8Encoding]::new($false)
$cp   = [System.Text.Encoding]::GetEncoding(1258)
$strict = [System.Text.UTF8Encoding]::new($false, $true)
$text = [System.IO.File]::ReadAllText($Path, $utf8)
# ensure no stray BOM char
if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }
$rx = [System.Text.RegularExpressions.Regex]'[^\x00-\x7F]+'
$fixed = 0; $kept = 0
$result = $rx.Replace($text, [System.Text.RegularExpressions.MatchEvaluator]{
  param($m)
  try {
    $bytes = $cp.GetBytes($m.Value)
    $decoded = $strict.GetString($bytes)
    if ($decoded.IndexOf([char]0xFFFD) -ge 0) { throw 'replacement char' }
    $script:fixed++
    return $decoded
  } catch {
    $script:kept++
    return $m.Value
  }
})
[System.IO.File]::WriteAllText($Path, $result, $utf8)
"recovered: $fixed  kept: $kept"
$i = $result.IndexOf('Share Build')
'sample: ' + $result.Substring([Math]::Max(0,$i-10), 25)
