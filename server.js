const express = require('express');
const path = require('path');
const cors = require('cors');

// ============================================================
// INICIALIZACIÓN
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(cors());
app.use(express.json()); // Para parsear JSON en peticiones POST
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// BASE DE DATOS EN MEMORIA (para el carrito)
// NOTA: Esto se reinicia cada vez que el servidor se reinicia.
// Para producción usa MongoDB, PostgreSQL o Redis.
// ============================================================
let cartItems = [];

// ============================================================
// RUTAS DE LA API
// ============================================================

// Ruta principal - sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// RUTAS DEL CARRITO (API REST)
// ============================================================

// Obtener el carrito actual
app.get('/api/cart', (req, res) => {
    res.json({
        success: true,
        data: cartItems,
        total: cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    });
});

// Agregar producto al carrito
app.post('/api/cart/add', (req, res) => {
    const { id, name, price, qty = 1 } = req.body;
    
    if (!id || !name || !price) {
        return res.status(400).json({
            success: false,
            error: 'Faltan datos: id, name y price son obligatorios'
        });
    }

    // Buscar si el producto ya existe en el carrito
    const existingItem = cartItems.find(item => item.id === id);
    
    if (existingItem) {
        // Si existe, aumentar la cantidad
        existingItem.qty += qty;
    } else {
        // Si no existe, agregarlo nuevo
        cartItems.push({
            id,
            name,
            price: parseFloat(price),
            qty: parseInt(qty)
        });
    }

    res.json({
        success: true,
        message: 'Producto agregado al carrito',
        data: cartItems,
        total: cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    });
});

// Actualizar cantidad de un producto
app.put('/api/cart/update/:id', (req, res) => {
    const { id } = req.params;
    const { qty } = req.body;

    if (!qty || qty < 0) {
        return res.status(400).json({
            success: false,
            error: 'La cantidad debe ser un número mayor a 0'
        });
    }

    const item = cartItems.find(item => item.id === parseInt(id));
    
    if (!item) {
        return res.status(404).json({
            success: false,
            error: 'Producto no encontrado en el carrito'
        });
    }

    if (qty === 0) {
        // Si la cantidad es 0, eliminar el producto
        cartItems = cartItems.filter(item => item.id !== parseInt(id));
    } else {
        item.qty = parseInt(qty);
    }

    res.json({
        success: true,
        message: 'Cantidad actualizada',
        data: cartItems,
        total: cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    });
});

// Eliminar producto del carrito
app.delete('/api/cart/remove/:id', (req, res) => {
    const { id } = req.params;
    
    const itemExists = cartItems.some(item => item.id === parseInt(id));
    
    if (!itemExists) {
        return res.status(404).json({
            success: false,
            error: 'Producto no encontrado en el carrito'
        });
    }

    cartItems = cartItems.filter(item => item.id !== parseInt(id));

    res.json({
        success: true,
        message: 'Producto eliminado del carrito',
        data: cartItems,
        total: cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    });
});

// Vaciar el carrito completamente
app.delete('/api/cart/clear', (req, res) => {
    cartItems = [];
    res.json({
        success: true,
        message: 'Carrito vaciado',
        data: cartItems,
        total: 0
    });
});

// ============================================================
// RUTA DE CHECKOUT (simulada)
// ============================================================
app.post('/api/checkout', (req, res) => {
    if (cartItems.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'El carrito está vacío'
        });
    }

    const total = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    
    // Aquí iría la integración con Stripe, MercadoPago, etc.
    // Por ahora solo simulamos una respuesta exitosa
    
    // Guardar el pedido (en producción, guardar en base de datos)
    const order = {
        id: Date.now(),
        items: [...cartItems],
        total: total,
        date: new Date().toISOString(),
        status: 'pending'
    };

    // Vaciar el carrito después del checkout
    cartItems = [];

    res.json({
        success: true,
        message: 'Pedido realizado con éxito',
        order: order
    });
});

// ============================================================
// MANEJO DE ERRORES (404)
// ============================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

// ============================================================
// INICIAR EL SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📦 API de carrito: http://localhost:${PORT}/api/cart`);
    console.log(`✨ Modo: ${process.env.NODE_ENV || 'development'}`);
});

// Manejar cierre graceful
process.on('SIGTERM', () => {
    console.log('🛑 Recibido SIGTERM, cerrando servidor...');
    process.exit(0);
});
