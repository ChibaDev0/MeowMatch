$w = New-Object -ComObject Word.Application
$d = $w.Documents.Open('D:\_DevProject\MeowMatch\docs\report\MeowMatch-Final-Report-v2.docx')
$d.Fields.Update() | Out-Null
foreach($t in $d.TablesOfContents){$t.Update(); $f=$t.Range.Font; $f.Name='TH Sarabun New'; $f.NameBi='TH Sarabun New'; $f.NameAscii='TH Sarabun New'; $f.NameOther='TH Sarabun New'; $f.Size=16; $f.SizeBi=16}
$d.Save(); $d.SaveAs2('D:\_DevProject\MeowMatch\docs\report\MeowMatch-Final-Report-v2.pdf', 17); $d.Close(); $w.Quit()
