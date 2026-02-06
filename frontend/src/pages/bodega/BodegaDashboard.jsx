import { AlertasStock } from '../../components/inventario/AlertasStock';

export default function BodegaDashboard() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Panel de Bodega</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-96">
                    <AlertasStock />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Map className="w-5 h-5" />
                            Mapa de Ubicaciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500">Próximamente: Mapa visual interactivo del almacén.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
