/* *
 * Este é o 10-init.js (seu mongo-init.js)
 */

/* * 1. Autentica como 'admin' (definido no docker-compose.yml)
 */
db.getSiblingDB('admin').auth(
  process.env.MONGO_INITDB_ROOT_USERNAME,
  process.env.MONGO_INITDB_ROOT_PASSWORD
);

/* * 2. Agora sim, muda para o banco 'db_pga'
 */
db = db.getSiblingDB('db_pga');

/* * 3. Cria o usuário 'user_pga' que a APLICAÇÃO usa para se conectar
 */
db.createUser({
  user: 'user_pga',
  pwd: 'password_pga',
  roles: [{ role: 'readWrite', db: 'db_pga' }],
});

/* * 4. Cria APENAS a coleção 'institutions'
 * (Pois ela não está no seu backup e deve começar vazia).
 *
 * As outras (users, documents, projetos) serão
 * criadas automaticamente pelo restore.sh.
 */
db.createCollection('institutions');