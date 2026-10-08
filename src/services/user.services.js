const userRepository = require("../repositories/user.repository");

const userService = {
  async getAllUsers() {
    return userRepository.findAll();
  },

  async getUser(filter) {
    return userRepository.findFirst(filter);
  },

  async createUser(data) {
    return userRepository.create(data);
  },
};

module.exports = userService;