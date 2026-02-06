const productosService = require('../services/productos.service');

const getProductos = async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const data = await productosService.getAllProductos(page, limit, search);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProducto = async (req, res) => {
    try {
        const producto = await productosService.getProductoById(req.params.id);
        if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createProducto = async (req, res) => {
    try {
        const producto = await productosService.createProducto(req.body);
        res.status(201).json(producto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateProducto = async (req, res) => {
    try {
        const producto = await productosService.updateProducto(req.params.id, req.body);
        res.json(producto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteProducto = async (req, res) => {
    try {
        await productosService.deleteProducto(req.params.id);
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getProductos,
    getProducto,
    createProducto,
    updateProducto,
    deleteProducto
};
