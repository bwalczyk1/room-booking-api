const knex = require("knex");
const config = require("../../knexfile");

// Jeden obiekt na całą aplikację - pod spodem pula połączeń
module.exports = knex(config);
