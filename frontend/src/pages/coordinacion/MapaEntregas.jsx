import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Truck, User, Phone, Navigation, Package, Clock, AlertTriangle } from 'lucide-react';

// Nota: Este componente usa Leaflet que debe estar cargado via CDN o npm
// Añadir en index.html:
// <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
// <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

const MapaEntregas = ({ pedidos = [], ruteros = [], onPedidoClick }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [filterEstado, setFilterEstado] = useState('todos');

    // Centro por defecto (México)
    const defaultCenter = [20.6597, -103.3496]; // Guadalajara como ejemplo

    // Inicializar mapa
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Verificar si Leaflet está disponible
        if (typeof window.L === 'undefined') {
            console.warn('Leaflet no está cargado. Añade el CDN en index.html');
            return;
        }

        const L = window.L;

        // Crear mapa
        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, 12);

        // Capa de tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Actualizar marcadores cuando cambian los pedidos
    useEffect(() => {
        if (!mapInstanceRef.current || typeof window.L === 'undefined') return;

        const L = window.L;
        const map = mapInstanceRef.current;

        // Limpiar marcadores anteriores
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Filtrar pedidos
        const pedidosFiltrados = filterEstado === 'todos'
            ? pedidos
            : pedidos.filter(p => p.estado === filterEstado);

        // Colores por estado
        const coloresPorEstado = {
            pendiente: '#eab308',
            aprobado: '#3b82f6',
            preparando: '#8b5cf6',
            listo: '#06b6d4',
            en_ruta: '#6366f1',
            entregado: '#22c55e',
            cancelado: '#ef4444'
        };

        // Añadir marcadores de pedidos
        pedidosFiltrados.forEach(pedido => {
            if (!pedido.lat_entrega || !pedido.lng_entrega) return;

            const color = coloresPorEstado[pedido.estado] || '#6b7280';

            // Icono personalizado
            const icon = L.divIcon({
                html: `
          <div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              transform: rotate(45deg);
              color: white;
              font-size: 12px;
              font-weight: bold;
            ">📦</span>
          </div>
        `,
                className: 'custom-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([pedido.lat_entrega, pedido.lng_entrega], { icon })
                .addTo(map)
                .bindPopup(`
          <div style="min-width: 200px; font-family: system-ui;">
            <h3 style="font-weight: bold; color: #1e293b; margin-bottom: 8px;">
              ${pedido.folio}
            </h3>
            <p style="margin: 4px 0; color: #475569;">
              <strong>Cliente:</strong> ${pedido.cliente_nombre || 'Sin nombre'}
            </p>
            <p style="margin: 4px 0; color: #475569;">
              <strong>Estado:</strong> 
              <span style="
                background: ${color}20;
                color: ${color};
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 12px;
              ">${pedido.estado}</span>
            </p>
            <p style="margin: 4px 0; color: #475569;">
              <strong>Rutero:</strong> ${pedido.rutero_nombre || 'Sin asignar'}
            </p>
            <p style="margin: 4px 0; color: #475569; font-size: 12px;">
              📍 ${pedido.direccion_entrega || 'Sin dirección'}
            </p>
          </div>
        `);

            marker.on('click', () => {
                setSelectedPedido(pedido);
                if (onPedidoClick) onPedidoClick(pedido);
            });

            markersRef.current.push(marker);
        });

        // Añadir marcadores de ruteros
        ruteros.forEach(rutero => {
            if (!rutero.lat || !rutero.lng) return;

            const estadoColor = rutero.estado_ubicacion === 'en_ruta' ? '#22c55e' : '#6366f1';

            const icon = L.divIcon({
                html: `
          <div style="
            background-color: ${estadoColor};
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse 2s infinite;
          ">
            <span style="font-size: 20px;">🚚</span>
          </div>
        `,
                className: 'rutero-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            const marker = L.marker([rutero.lat, rutero.lng], { icon })
                .addTo(map)
                .bindPopup(`
          <div style="min-width: 180px; font-family: system-ui;">
            <h3 style="font-weight: bold; color: #1e293b; margin-bottom: 8px;">
              🚚 ${rutero.nombre}
            </h3>
            <p style="margin: 4px 0; color: #475569;">
              <strong>Estado:</strong> ${rutero.estado_ubicacion || 'Inactivo'}
            </p>
            <p style="margin: 4px 0; color: #475569;">
              <strong>Pedidos:</strong> ${rutero.pedidos_asignados || 0}
            </p>
            ${rutero.telefono ? `
              <p style="margin: 4px 0; color: #475569;">
                📞 ${rutero.telefono}
              </p>
            ` : ''}
          </div>
        `);

            markersRef.current.push(marker);
        });

        // Ajustar vista si hay marcadores
        if (markersRef.current.length > 0) {
            const group = L.featureGroup(markersRef.current);
            map.fitBounds(group.getBounds().pad(0.1));
        }

    }, [pedidos, ruteros, filterEstado, onPedidoClick]);

    // Fallback si Leaflet no está disponible
    const LeafletFallback = () => (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 text-center">
            <MapPin className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Mapa no disponible</h3>
            <p className="text-slate-400 mb-4">
                Para habilitar el mapa, añade Leaflet al proyecto.
            </p>
            <div className="bg-slate-900 rounded-lg p-4 text-left text-sm font-mono text-slate-300">
                <p className="text-violet-400">{`<!-- Añadir en index.html -->`}</p>
                <p>{`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`}</p>
                <p>{`<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`}</p>
            </div>

            {/* Lista de pedidos como fallback */}
            <div className="mt-6 space-y-2 text-left">
                <h4 className="font-medium text-slate-300">Pedidos con ubicación:</h4>
                {pedidos.filter(p => p.lat_entrega && p.lng_entrega).map(pedido => (
                    <div
                        key={pedido.id}
                        onClick={() => onPedidoClick && onPedidoClick(pedido)}
                        className="bg-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-700"
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-violet-400">{pedido.folio}</span>
                            <span className="text-sm text-slate-400">{pedido.estado}</span>
                        </div>
                        <p className="text-sm">{pedido.cliente_nombre}</p>
                        <p className="text-xs text-slate-400">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {pedido.direccion_entrega}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Barra de herramientas del mapa */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-violet-400" />
                    <span className="font-medium">Mapa de Entregas</span>
                    <span className="text-sm text-slate-400">
                        ({pedidos.filter(p => p.lat_entrega).length} ubicaciones)
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filtro por estado */}
                    <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="en_ruta">En Ruta</option>
                        <option value="entregado">Entregados</option>
                    </select>

                    {/* Leyenda */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                            Pendiente
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                            En Ruta
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Entregado
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                            Rutero
                        </span>
                    </div>
                </div>
            </div>

            {/* Contenedor del mapa */}
            {typeof window !== 'undefined' && typeof window.L !== 'undefined' ? (
                <div
                    ref={mapRef}
                    className="h-[500px] w-full"
                    style={{ background: '#1e293b' }}
                />
            ) : (
                <LeafletFallback />
            )}

            {/* Panel lateral con lista de pedidos */}
            <div className="border-t border-slate-700 p-4">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                    {/* Estadísticas rápidas */}
                    <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">{pedidos.filter(p => p.estado === 'pendiente').length} pendientes</span>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-2 rounded-lg">
                        <Truck className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm">{pedidos.filter(p => p.estado === 'en_ruta').length} en ruta</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg">
                        <Package className="w-4 h-4 text-green-400" />
                        <span className="text-sm">{pedidos.filter(p => p.estado === 'entregado').length} entregados</span>
                    </div>
                    <div className="flex items-center gap-2 bg-violet-500/10 px-3 py-2 rounded-lg">
                        <Navigation className="w-4 h-4 text-violet-400" />
                        <span className="text-sm">{ruteros.filter(r => r.lat).length} ruteros activos</span>
                    </div>
                </div>
            </div>

            {/* CSS para animación de pulso */}
            <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        .custom-marker, .rutero-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
        </div>
    );
};

export default MapaEntregas;
