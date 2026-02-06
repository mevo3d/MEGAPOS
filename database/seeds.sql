-- 1. SUCURSALES
INSERT INTO sucursales (nombre, tipo, codigo, direccion) VALUES
('Sucursal Centro', 'sucursal', 'SUC01', 'Av. Reforma 123, Centro'),
('Sucursal Norte', 'sucursal', 'SUC02', 'Blvd. Norte 4500, Plaza San Pedro'),
('Sucursal Sur', 'sucursal', 'SUC03', 'Av. 11 Sur 8900, Mayorazgo'),
('CEDIS Principal', 'cedis', 'CEDIS', 'Parque Industrial 2000, Nave 4');

-- 2. PUNTOS DE VENTA (CAJAS)
INSERT INTO puntos_venta (sucursal_id, nombre, tipo) VALUES
(1, 'Caja 1 - Centro', 'fijo'),
(1, 'Caja 2 - Centro', 'fijo'),
(2, 'Caja 1 - Norte', 'fijo'),
(3, 'Caja 1 - Sur', 'fijo'),
(4, 'Ruta 1 - Norte', 'movil'),
(4, 'Ruta 2 - Sur', 'movil');

-- 3. EMPLEADOS (Passwords son '123456' hasheados con bcrypt)
INSERT INTO empleados (sucursal_id, nombre, email, password_hash, rol, pin_acceso) VALUES
(4, 'Administrador General', 'admin@megamayoreo.com', '$2b$10$X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j', 'admin', '0000'),
(1, 'Gerente Centro', 'gerente.centro@megamayoreo.com', '$2b$10$X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j', 'gerente', '1111'),
(1, 'Cajero Centro 1', 'cajero1.centro@megamayoreo.com', '$2b$10$X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j', 'cajero', '1234'),
(2, 'Cajero Norte 1', 'cajero1.norte@megamayoreo.com', '$2b$10$X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j', 'cajero', '2222'),
(4, 'Vendedor Ruta 1', 'ruta1@megamayoreo.com', '$2b$10$X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j.X7V.j', 'vendedor', '5555');

-- 4. CATEGORIAS
INSERT INTO categorias (nombre, descripcion) VALUES
('Abarrotes', 'Productos básicos de despensa'),
('Bebidas', 'Refrescos, jugos y aguas'),
('Limpieza', 'Productos de limpieza para el hogar'),
('Dulcería', 'Dulces y chocolates'),
('Higiene Personal', 'Jabones, shampoos, etc.');

-- 5. PRODUCTOS
INSERT INTO productos (sku, codigo_barras, nombre, categoria_id, precio_base, costo_promedio, unidad_medida) VALUES
('AB001', '75010001', 'Aceite 123 1L', 1, 45.50, 38.00, 'pieza'),
('AB002', '75010002', 'Arroz Verde Valle 1kg', 1, 28.00, 22.50, 'pieza'),
('BE001', '75010003', 'Coca Cola 600ml', 2, 18.00, 14.00, 'pieza'),
('BE002', '75010004', 'Agua Ciel 1L', 2, 12.00, 8.50, 'pieza'),
('LI001', '75010005', 'Cloralex 1L', 3, 15.50, 11.00, 'pieza'),
('LI002', '75010006', 'Fabuloso Lavanda 1L', 3, 22.00, 16.50, 'pieza');

-- 6. INVENTARIO INICIAL
-- Centro
INSERT INTO inventario (producto_id, sucursal_id, stock_fisico) VALUES
(1, 1, 100), (2, 1, 150), (3, 1, 200), (4, 1, 100), (5, 1, 50), (6, 1, 60);
-- Norte
INSERT INTO inventario (producto_id, sucursal_id, stock_fisico) VALUES
(1, 2, 80), (2, 2, 120), (3, 2, 180), (4, 2, 90), (5, 2, 40), (6, 2, 50);
-- CEDIS
INSERT INTO inventario (producto_id, sucursal_id, stock_fisico) VALUES
(1, 4, 1000), (2, 4, 2000), (3, 4, 5000), (4, 4, 3000), (5, 4, 1500), (6, 4, 1200);

-- 7. CLIENTES
INSERT INTO clientes (nombre, nombre_comercial, rfc, tipo_precio) VALUES
('Juan Pérez', 'Tienda La Esperanza', 'XAXX010101000', 'general'),
('María López', 'Abarrotes Mary', 'XAXX020202000', 'mayoreo'),
('Pedro Sánchez', 'Minisuper El Sol', 'XAXX030303000', 'distribuidor');

-- 8. RUTAS
INSERT INTO rutas (nombre, vendedor_id, dia_semana) VALUES
('Ruta Norte - Lunes', 5, 1),
('Ruta Norte - Jueves', 5, 4);
