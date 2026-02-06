$baseUrl = "http://localhost:3005/api"
$user = "admin"
$pass = "admin123"

# 1. Login
echo "1. Logging in..."
$loginBody = @{ email = $user; password = $pass } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

if (!$token) { echo "Login Failed"; exit }
echo "Token obtained."

# 2. Create Order
echo "`n2. Creating Order..."
$orderBody = @{
    sucursal_id = 1
    cliente_id = 1
    items = @( @{ producto_id = 1; cantidad = 5; precio_unitario = 100 } )
    total = 500
    metodo_pago = "transferencia"
} | ConvertTo-Json
$orderRes = Invoke-RestMethod -Uri "$baseUrl/pedidos" -Method Post -Body $orderBody -Headers $headers -ContentType "application/json"
$orderId = $orderRes.pedido.id
echo "Order Created: #$orderId (Status: $($orderRes.pedido.estado_pago))"

# 3. Generate Reference
echo "`n3. Generating Reference..."
$refRes = Invoke-RestMethod -Uri "$baseUrl/pagos-b2b/referencia/$orderId" -Method Get -Headers $headers
$ref = $refRes.referencia
echo "Reference: $ref"

# 4. Simulate Webhook
echo "`n4. Simulating Webhook (Transfer Detected)..."
$webhookBody = @{
    proveedor = "spei"
    external_id = "TRACK-9999"
    monto = 500
    referencia_interna = $ref # Contains Order ID
    metadata = @{ bancxo = "BBVA" }
} | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/pagos-b2b/webhook" -Method Post -Body $webhookBody -ContentType "application/json"
echo "Webhook Sent."

# 5. Verify 'Detectado' Status
echo "`n5. Verifying Order Status (Expect: detectado)..."
$checkRes = Invoke-RestMethod -Uri "$baseUrl/pedidos/$orderId" -Method Get -Headers $headers
echo "Current Status: $($checkRes.estado_pago)"

if ($checkRes.estado_pago -eq 'detectado') { echo "✅ SUCCESS: Status is detected" } else { echo "❌ FAIL: Status mismatch" }

# 6. Check Accounting Pendientes List
echo "`n6. Checking Accounting Dashboard List..."
$pendientes = Invoke-RestMethod -Uri "$baseUrl/pagos-b2b/pendientes" -Method Get -Headers $headers
$found = $pendientes | Where-Object { $_.id -eq $orderId }
if ($found) { echo "✅ SUCCESS: Order found in Pending Audit List" } else { echo "❌ FAIL: Order not in list" }

# 7. Confirm Payment
echo "`n7. Confirming Payment (Accounting)..."
$confirmBody = @{ usuario_id = 1; notas = "Approved via Test Script" } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/pagos-b2b/confirmar/$orderId" -Method Post -Body $confirmBody -Headers $headers -ContentType "application/json"
echo "Payment Confirmed."

# 8. Verify 'Confirmado' and Logistics Visibility
echo "`n8. Verifying Logistics Visibility (CEDIS)..."
# Fetch Logistics List (filtered by estado_pago=confirmado)
$logisticsList = Invoke-RestMethod -Uri "$baseUrl/pedidos/sucursal/1?estado=preparando&estado_pago=confirmado" -Method Get -Headers $headers
$foundLogistics = $logisticsList | Where-Object { $_.id -eq $orderId }

if ($foundLogistics) { 
    echo "✅✅✅ SUCCESS: Order #$orderId is visible in Logistics List for Picking!" 
} else { 
    echo "❌❌❌ FAIL: Order not found in Logistics List" 
}
