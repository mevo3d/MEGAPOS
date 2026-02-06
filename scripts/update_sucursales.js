const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

console.log('Actualizando nombres de sucursales...');

db.serialize(() => {
    db.run('UPDATE sucursales SET nombre = "Globolandia" WHERE id = 1');
    db.run('UPDATE sucursales SET nombre = "Megacentro" WHERE id = 2');
    db.run('UPDATE sucursales SET nombre = "Todo de Papelería" WHERE id = 3');
    db.run('UPDATE sucursales SET nombre = "CEDIS Central" WHERE id = 4');

    db.all('SELECT id, nombre FROM sucursales', (err, rows) => {
        console.log('\n🏪 Sucursales actualizadas:');
        rows.forEach(s => console.log(`  ${s.id}. ${s.nombre}`));
        db.close();
        console.log('\n✅ Listo!');
    });
});
