$headers = @{ "Authorization" = "token 03330270e330d49:9c2261ae11ac2d2" }
$baseUrl = "https://smartup.m.frappe.cloud"

function Get-DocTypeFields($docType) {
    $uri = "$baseUrl/api/resource/DocType/$($docType.Replace(' ', '%20'))"
    $resp = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers
    $resp.data.fields | Select-Object fieldname, fieldtype, label, options, reqd, default | ConvertTo-Json -Depth 5
}

function Get-ListData($docType, $limit=10) {
    $uri = "$baseUrl/api/method/frappe.client.get_list"
    $body = @{
        doctype = $docType
        fields = @("*")
        limit_page_length = $limit
    } | ConvertTo-Json
    Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
}

Write-Host "--- Command 1 ---"
Get-DocTypeFields "Assessment Plan"
Write-Host "--- Command 2 ---"
Get-DocTypeFields "Assessment Result"
Write-Host "--- Command 3 ---"
Get-DocTypeFields "Assessment Result Detail"
Write-Host "--- Command 4 ---"
Get-DocTypeFields "Grading Scale"
Write-Host "--- Command 5 ---"
Get-DocTypeFields "Grading Scale Interval"
Write-Host "--- Command 6 ---"
Get-DocTypeFields "Assessment Group"
Write-Host "--- Command 7 ---"
Get-DocTypeFields "Student Attendance"
Write-Host "--- Command 8 ---"
Get-DocTypeFields "Assessment Plan Criteria"
Write-Host "--- Command 9 ---"
Get-ListData "Assessment Plan" 5
Write-Host "--- Command 10 ---"
Get-ListData "Assessment Result" 10
Write-Host "--- Command 11 ---"
Get-ListData "Assessment Criteria" 10
Write-Host "--- Command 12 ---"
Get-ListData "Assessment Group" 10
Write-Host "--- Command 13 ---"
Get-ListData "Grading Scale" 5
Write-Host "--- Command 14 ---"
Get-ListData "Grading Scale Interval" 20
