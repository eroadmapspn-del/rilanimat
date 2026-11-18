# Local text-to-speech with real word timings (Windows SAPI). No network, no API key.
# Usage: powershell -File sapi_tts.ps1 -TextFile in.txt -Out voice.wav -Json words.json [-Voice "Microsoft Zira Desktop"] [-Rate 0]
param([string]$TextFile, [string]$Out, [string]$Json, [string]$Voice = "", [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies System.Speech -TypeDefinition @"
using System; using System.Collections.Generic; using System.Speech.Synthesis; using System.Text;
public class WordCollector {
  public List<string> Rows = new List<string>();
  public void Attach(SpeechSynthesizer s) { s.SpeakProgress += (o, e) => {
    Rows.Add("{\"w\":" + Q(e.Text) + ",\"start\":" + e.AudioPosition.TotalSeconds.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture) + "}"); }; }
  static string Q(string t) { return "\"" + t.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\""; }
  public string ToJson() { return "[" + string.Join(",", Rows) + "]"; }
}
"@
$text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($Voice) { $s.SelectVoice($Voice) }
$s.Rate = $Rate
$c = New-Object WordCollector
$c.Attach($s)
$s.SetOutputToWaveFile($Out)
$s.Speak($text)
$s.SetOutputToNull()
$s.Dispose()
[System.IO.File]::WriteAllText($Json, $c.ToJson(), (New-Object System.Text.UTF8Encoding($false)))
