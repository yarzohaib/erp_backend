const db = require("../config/prisma");

const User = db.orm.public.User;

const userRepository = {
  async findAll() {
    return User.all();
  },

  async findFirst(filter) {
    return User.first(filter);
  },

  async create(data) {
    return User.create(data);
  },

  async createMany(data) {
    return User.createAll(data);
  },

  async updatePassword(userId, passwordHash) {
  const query = db.raw.sql`
    UPDATE "User"
    SET
      "password" = ${passwordHash},
      "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `
    .affectedCount()
    .build();

  return db.runtime().execute(query);
},
};

module.exports = userRepository;