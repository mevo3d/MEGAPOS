import React, { useState, useCallback } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const ProductImport = ({ userRole, sucursalId }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [detallesImportacion, setDetallesImportacion] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Cargar historial de importaciones
  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/import/historial');
      setHistorial(response.data.data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('No se pudo cargar el historial de importaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Descargar plantilla
  const descargarPlantilla = async () => {
    try {
      const response = await api.get('/import/plantilla', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'plantilla_productos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      setError('No se pudo descargar la plantilla');
    }
  };

  // Manejo de archivos
  const handleFileSelect = (file) => {
    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.xls', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Solo se permiten archivos Excel (.xls, .xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('El archivo es demasiado grande. Máximo permitido: 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Subir archivo
  const uploadFile = async () => {
    if (!selectedFile) {
      setError('Por favor selecciona un archivo');
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError('');

      const formData = new FormData();
      formData.append('archivo', selectedFile);

      // Simular progreso (la API real podría enviar progreso)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await api.post('/import/productos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      setImportResult(response.data.data);
      setSelectedFile(null);

      // Resetear el input de archivo
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

      // Recargar historial
      await cargarHistorial();

    } catch (error) {
      console.error('Error en importación:', error);
      setError(error.response?.data?.message || 'Error en la importación');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // Ver detalles de importación
  const verDetalles = async (importId) => {
    try {
      setLoading(true);
      const response = await api.get(`/import/detalles/${importId}`);
      setDetallesImportacion(response.data.data);
    } catch (error) {
      console.error('Error obteniendo detalles:', error);
      setError('No se pudo obtener los detalles de la importación');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar estado de importación
  const renderEstado = (estado) => {
    switch (estado) {
      case 'completado':
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} /> Completado</span>;
      case 'completado_con_errores':
        return <span className="flex items-center gap-1 text-yellow-600"><AlertCircle size={16} /> Con errores</span>;
      case 'error':
        return <span className="flex items-center gap-1 text-red-600"><XCircle size={16} /> Error</span>;
      case 'procesando':
        return <span className="flex items-center gap-1 text-blue-600"><Clock size={16} /> Procesando</span>;
      case 'cancelado':
        return <span className="flex items-center gap-1 text-gray-600"><XCircle size={16} /> Cancelado</span>;
      default:
        return estado;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-blue-600" size={24} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Importación de Productos</h1>
                <p className="text-sm text-gray-600">
                  Carga masiva de productos desde archivos Excel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarHistorial}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {showHistorial ? 'Ocultar' : 'Ver'} Historial
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Sección de descarga de plantilla */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Paso 1: Descargar Plantilla
                </h3>
                <p className="text-sm text-blue-700">
                  Descarga la plantilla para asegurar que tu archivo tenga el formato correcto
                </p>
              </div>
              <button
                onClick={descargarPlantilla}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download size={20} />
                Descargar Plantilla
              </button>
            </div>
          </div>

          {/* Sección de carga de archivo */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Paso 2: Cargar Archivo Excel
            </h3>

            {/* Área de arrastrar y soltar */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />

              <div className="flex flex-col items-center">
                <Upload size={48} className="text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Arrastra tu archivo Excel aquí
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  o haz clic para seleccionarlo
                </p>
                <p className="text-xs text-gray-500">
                  Formatos soportados: .xls, .xlsx (Máximo 10MB, 5000 productos)
                </p>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="text-green-600" size={20} />
                      <span className="text-sm font-medium text-gray-900">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-500 hover:text-red-700"
                      disabled={uploading}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de importar */}
            {selectedFile && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={uploadFile}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Importar Productos
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Barra de progreso */}
            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Procesando importación...</span>
                  <span className="text-sm font-medium text-gray-900">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Errores */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={20} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Resultado de importación */}
            {importResult && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-md">
                <h4 className="text-lg font-semibold text-green-900 mb-4">
                  Importación Completada
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-md">
                    <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="bg-white p-3 rounded-md">
                    <div className="text-2xl font-bold text-green-600">{importResult.procesados}</div>
                    <div className="text-sm text-gray-600">Procesados</div>
                  </div>
                  <div className="bg-white p-3 rounded-md">
                    <div className="text-2xl font-bold text-red-600">{importResult.errores}</div>
                    <div className="text-sm text-gray-600">Errores</div>
                  </div>
                  <div className="bg-white p-3 rounded-md">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.duplicados}</div>
                    <div className="text-sm text-gray-600">Duplicados</div>
                  </div>
                </div>

                {importResult.errores > 0 && (
                  <div className="mt-4">
                    <details className="bg-white p-3 rounded-md">
                      <summary className="cursor-pointer text-sm font-medium text-red-700">
                        Ver detalles de errores ({importResult.errores})
                      </summary>
                      <div className="mt-2 max-h-48 overflow-y-auto">
                        {importResult.detalles.map((error, index) => (
                          <div key={index} className="text-xs text-gray-600 py-1 border-b border-gray-100">
                            <span className="font-medium">Fila {error.fila}:</span> {error.mensaje}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historial de importaciones */}
          {showHistorial && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Historial de Importaciones
              </h3>

              {historial.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileSpreadsheet size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay importaciones previas</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procesados</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {historial.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(item.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.nombre_archivo}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.empleado_nombre}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.total_registros}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.registros_procesados}</td>
                            <td className="px-4 py-3 text-sm">{renderEstado(item.estado)}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => verDetalles(item.id)}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles de importación */}
      {detallesImportacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de Importación
              </h3>
              <button
                onClick={() => setDetallesImportacion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                {/* Información general */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-2 font-medium">{detallesImportacion.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Archivo:</span>
                      <span className="ml-2 font-medium">{detallesImportacion.nombre_archivo}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Usuario:</span>
                      <span className="ml-2 font-medium">{detallesImportacion.empleado_nombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sucursal:</span>
                      <span className="ml-2 font-medium">{detallesImportacion.sucursal_nombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Inicio:</span>
                      <span className="ml-2 font-medium">
                        {new Date(detallesImportacion.fecha_inicio).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fin:</span>
                      <span className="ml-2 font-medium">
                        {detallesImportacion.fecha_fin
                          ? new Date(detallesImportacion.fecha_fin).toLocaleString()
                          : 'En proceso'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Estadísticas</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {detallesImportacion.total_registros}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {detallesImportacion.registros_procesados}
                      </div>
                      <div className="text-xs text-gray-600">Procesados</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">
                        {detallesImportacion.registros_errores}
                      </div>
                      <div className="text-xs text-gray-600">Errores</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">
                        {detallesImportacion.registros_duplicados}
                      </div>
                      <div className="text-xs text-gray-600">Duplicados</div>
                    </div>
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Estado</h4>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium">
                    {renderEstado(detallesImportacion.estado)}
                  </div>
                </div>

                {/* Errores */}
                {detallesImportacion.errores_detalle && detallesImportacion.errores_detalle.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Detalles de Errores</h4>
                    <div className="max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4">
                      {detallesImportacion.errores_detalle.map((error, index) => (
                        <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-red-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Fila {error.fila} - {error.tipo}
                              </div>
                              <div className="text-xs text-gray-600">{error.mensaje}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImport;