"""
Script para eliminar fondo blanco de imágenes de productos.
Usa rembg (https://github.com/danielgatis/rembg) para procesamiento con IA.

Uso: python remove_background.py <ruta_imagen_entrada> <ruta_imagen_salida>

Instalación de dependencias:
pip install rembg pillow
"""

import sys
import os
from rembg import remove
from PIL import Image

def remove_background(input_path, output_path):
    """
    Elimina el fondo de una imagen y guarda el resultado.
    """
    try:
        # Leer imagen de entrada
        input_image = Image.open(input_path)
        
        # Procesar con rembg (eliminar fondo)
        output_image = remove(input_image)
        
        # Guardar imagen procesada como PNG (para mantener transparencia)
        output_image.save(output_path, 'PNG')
        
        print(f"SUCCESS: {output_path}")
        return True
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python remove_background.py <entrada> <salida>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"ERROR: Archivo no encontrado: {input_file}")
        sys.exit(1)
    
    success = remove_background(input_file, output_file)
    sys.exit(0 if success else 1)
