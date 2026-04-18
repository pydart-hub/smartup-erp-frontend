$headers = @{ "Authorization" = "token 03330270e330d49:9c2261ae11ac2d2" }
$uri = "https://smartup.m.frappe.cloud/api/resource/Payment%20Entry?filters=[[""Payment%20Entry%20Reference"",""reference_name"",""="",""ACC-SINV-2026-03777""]]"
$res = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers
$res.data | ConvertTo-Json
