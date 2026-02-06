import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Upload, Trash2, Image as ImageIcon, Check, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function LogoSettings() {
  const [logoInfo, setLogoInfo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Cargar información del logo actual
  useEffect(() => {
    loadLogoInfo();
  }, []);

  const loadLogoInfo = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/configuracion/logo/info');
      if (response.data.success && response.data.data) {
        setLogoInfo(response.data.data);
        // Cargar preview del logo
        loadLogoPreview();
      }
    } catch (error) {
      console.log('No hay logo actual:', error.response?.status);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogoPreview = async () => {
    try {
      const response = await api.get('/configuracion/logo', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      setLogoPreview(url);
    } catch (error) {
      console.error('Error cargando preview:', error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (PNG, JPG, WEBP, SVG)');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 5MB)');
      return;
    }

    // Mostrar preview local
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target.result);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    await uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/configuracion/logo/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setLogoInfo(response.data.data);
        toast.success(response.data.message || 'Logo actualizado exitosamente');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al subir el logo');
      // Recargar preview anterior
      loadLogoPreview();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoInfo || !window.confirm('¿Estás seguro de que deseas eliminar el logo?')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.delete(`/configuracion/logo/${logoInfo.id}`);
      
      if (response.data.success) {
        setLogoInfo(null);
        setLogoPreview(null);
        toast.success(response.data.message || 'Logo eliminado exitosamente');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el logo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Logo</h2>
        <p className="text-gray-600">Sube y gestiona el logo que se mostrará en el login y en las cajas</p>
      </div>

      {/* Card Principal */}
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <CardTitle>Logo Actual del Sistema</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Área de Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-8 min-h-64 flex items-center justify-center">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-full max-h-64 object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No hay logo actual</p>
                    <p className="text-gray-400 text-sm mt-2">Sube uno para comenzar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información y Controles */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Logo</h3>

                {logoInfo ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Logo Activo</p>
                          <p className="text-sm text-green-700 mt-1">
                            El logo se mostrará automáticamente en el login y en las cajas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nombre</label>
                        <p className="text-gray-900 mt-1">{logoInfo.nombre_original}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Tipo</label>
                        <p className="text-gray-900 mt-1">{logoInfo.tipo_archivo}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Tamaño</label>
                        <p className="text-gray-900 mt-1">
                          {logoInfo.tamaño ? `${(logoInfo.tamaño / 1024).toFixed(2)} KB` : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Actualizado</label>
                        <p className="text-gray-900 mt-1">
                          {logoInfo.updated_at ? new Date(logoInfo.updated_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Sin logo configurado</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Sube tu primer logo para personalizarlo en el sistema
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controles */}
              <div className="flex gap-3 mt-6">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                    className="w-full gradient-primary hover:opacity-90 shadow-lg"
                    isLoading={isUploading}
                    disabled={isUploading || isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Subiendo...' : logoInfo ? 'Actualizar Logo' : 'Subir Logo'}
                  </Button>
                </label>

                {logoInfo && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteLogo}
                    disabled={isLoading || isUploading}
                    className="border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Útil */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900 space-y-2">
          <p>✓ Formato recomendado: PNG con fondo transparente</p>
          <p>✓ Dimensiones óptimas: 300x300 px o superior</p>
          <p>✓ Tamaño máximo: 5 MB</p>
          <p>✓ El logo se adaptará automáticamente a diferentes resoluciones</p>
        </CardContent>
      </Card>
    </div>
  );
}
