$headers = @{ "Authorization" = "token 03330270e330d49:9c2261ae11ac2d2" }
$uri = "https://smartup.m.frappe.cloud/api/resource/Sales%20Invoice/ACC-SINV-2026-03777"
$inv = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers
$inv.data | Select-Object name, status, outstanding_amount, grand_total | ConvertTo-Json
